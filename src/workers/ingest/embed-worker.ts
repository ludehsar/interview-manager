import type { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda'
import { embedTexts } from '@/ai/embeddings'
import {
  chunksMissingEmbeddings,
  nodesMissingEmbeddings,
  writeChunkEmbeddings,
  writeNodeEmbeddings,
} from '@/domain/profile/kg'
import { ensureSecrets } from '../secrets'
import { embedMessageSchema } from './messages'

export type EmbedOutcome = { target: string; embedded: number }

async function processRecord(record: SQSRecord): Promise<EmbedOutcome> {
  const message = embedMessageSchema.parse(JSON.parse(record.body))

  if (message.v === 1) {
    console.log(`skipping legacy job embed message with ${message.jobIds.length} ids`)
    return { target: 'JOB', embedded: 0 }
  }

  const pending =
    message.target === 'CHUNK'
      ? await chunksMissingEmbeddings(message.userId, message.ids)
      : await nodesMissingEmbeddings(message.userId, message.ids)

  if (pending.length === 0) return { target: message.target, embedded: 0 }

  const vectors = await embedTexts(pending.map((row) => row.text))
  const rows = pending.map((row, index) => ({ id: row.id, embedding: vectors[index] }))

  const embedded =
    message.target === 'CHUNK' ? await writeChunkEmbeddings(rows) : await writeNodeEmbeddings(rows)

  return { target: message.target, embedded }
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  await ensureSecrets()
  const batchItemFailures: { itemIdentifier: string }[] = []

  for (const record of event.Records) {
    try {
      const outcome = await processRecord(record)
      console.log(`${outcome.target}: embedded=${outcome.embedded}`)
    } catch (error) {
      console.error('embed record failed', error)
      batchItemFailures.push({ itemIdentifier: record.messageId })
    }
  }

  return { batchItemFailures }
}
