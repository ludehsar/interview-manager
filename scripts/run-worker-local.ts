import type { SQSEvent, SQSRecord } from 'aws-lambda'
import { config } from 'dotenv'

config({ path: '.env' })
config({ path: '.env.local', override: true })

type Options = {
  tier?: 'A' | 'B' | 'C'
  sourceIds?: string[]
  force: boolean
  max: number
  idle: number
}

function parseArgs(argv: string[]): Options {
  const options: Options = { force: false, max: 500, idle: 2 }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--tier') options.tier = argv[++i] as Options['tier']
    else if (arg === '--source') options.sourceIds = [...(options.sourceIds ?? []), argv[++i]]
    else if (arg === '--force') options.force = true
    else if (arg === '--max') options.max = Number(argv[++i])
    else if (arg === '--idle') options.idle = Number(argv[++i])
  }
  return options
}

function queueUrl(): string {
  const url = process.env.INGEST_QUEUE_URL
  if (!url) throw new Error('INGEST_QUEUE_URL is not set')
  return url
}

function toRecord(message: { MessageId?: string; Body?: string; ReceiptHandle?: string }): SQSRecord {
  return {
    messageId: message.MessageId ?? '',
    receiptHandle: message.ReceiptHandle ?? '',
    body: message.Body ?? '',
    attributes: {} as SQSRecord['attributes'],
    messageAttributes: {},
    md5OfBody: '',
    eventSource: 'aws:sqs',
    eventSourceARN: 'local',
    awsRegion: process.env.AWS_REGION ?? 'ap-southeast-1',
  }
}

async function drain(options: Options): Promise<number> {
  const { handler: workerHandler } = await import('@/workers/ingest/worker')
  const { deleteBatch, receive } = await import('@/aws/sqs')
  const url = queueUrl()
  let processed = 0
  let idleRounds = 0

  while (processed < options.max && idleRounds < options.idle) {
    const messages = await receive(url, 2, 5)
    if (messages.length === 0) {
      idleRounds += 1
      continue
    }
    idleRounds = 0

    const records = messages.map(toRecord)
    const event: SQSEvent = { Records: records }
    const result = await workerHandler(event)
    const failed = new Set(result.batchItemFailures.map((failure) => failure.itemIdentifier))

    await deleteBatch(
      url,
      records
        .filter((record) => !failed.has(record.messageId))
        .map((record) => ({ id: record.messageId, receiptHandle: record.receiptHandle })),
    )
    processed += records.length
  }

  return processed
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const options = parseArgs(rest)
  const { dispatch } = await import('@/workers/ingest/dispatch')
  const { queueDepth } = await import('@/aws/sqs')
  const { closeDatabase } = await import('@/db/client')

  if (command === 'dispatch') {
    const result = await dispatch({ tier: options.tier, sourceIds: options.sourceIds, force: options.force })
    console.log(`dispatched ${result.enqueued} (skipped ${result.skipped}, disabled ${result.disabled})`)
  } else if (command === 'drain') {
    const processed = await drain(options)
    console.log(`processed ${processed} messages`)
  } else if (command === 'sweep') {
    const result = await dispatch({ tier: options.tier, sourceIds: options.sourceIds, force: options.force })
    console.log(`dispatched ${result.enqueued} (skipped ${result.skipped}, disabled ${result.disabled})`)
    const processed = await drain(options)
    const dlqUrl = queueUrl().replace(/\/ingest$/, '/ingest-dlq')
    const depth = await queueDepth(dlqUrl).catch(() => -1)
    console.log(`processed ${processed} messages, dlq depth ${depth}`)
  } else {
    console.log('usage: run-worker-local.ts <dispatch|drain|sweep> [--tier A] [--source id] [--force] [--max n]')
    process.exitCode = 1
  }

  await closeDatabase()
}

main().catch(async (error) => {
  console.error(error)
  const { closeDatabase } = await import('@/db/client')
  await closeDatabase()
  process.exit(1)
})
