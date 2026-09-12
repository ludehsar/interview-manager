import type { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda'
import { createHttpClient } from '@/adapters/http'
import { HttpError } from '@/adapters/http'
import { getAdapter, hostGaps } from '@/adapters/registry'
import { findSource } from '@/adapters/sources'
import type { SourceDefinition } from '@/adapters/types'
import { sendBatch } from '@/aws/sqs'
import { normalizeJob } from '@/domain/jobs/normalize'
import { classifyRegion } from '@/domain/jobs/region-classifier'
import { markFailure, markSuccess } from '@/domain/jobs/source-state'
import {
  collapseDuplicates,
  deactivateStale,
  loadDescribedIds,
  releaseOrphanedDuplicates,
  toInsert,
  upsertJobs,
} from '@/domain/jobs/store'
import { ingestMessageSchema } from './messages'

export type SweepOutcome = {
  sourceId: string
  fetched: number
  upserted: number
  deactivated: number
  collapsed: number
  released: number
}

class SourceFailure extends Error {}

function httpClient() {
  return createHttpClient({
    userAgent: process.env.ADAPTER_USER_AGENT ?? 'interview-manager/1.0',
    hostGaps: hostGaps(),
    timeoutMs: 30000,
  })
}

export async function sweepSource(source: SourceDefinition, maxPages: number): Promise<SweepOutcome> {
  const adapter = getAdapter(source.kind)
  const sweepStartedAt = new Date()
  const knownExternalIds = await loadDescribedIds(source.id)

  const payload = await adapter.fetchRaw(source, {
    http: httpClient(),
    now: sweepStartedAt,
    maxPages,
    knownExternalIds,
  })
  const parsed = adapter.parse(payload, source)

  const seenAt = new Date()
  const rows = []
  for (const job of parsed) {
    const region = await classifyRegion(job.locationRaw, `${job.title} ${(job.descriptionText ?? '').slice(0, 200)}`)
    rows.push(toInsert(normalizeJob(job, source, { region: region.region, countries: region.countries }), seenAt))
  }

  const upserted = await upsertJobs(rows)
  const deactivated = rows.length > 0 ? await deactivateStale(source.id, sweepStartedAt) : 0
  const fingerprints = [...new Set(rows.map((row) => row.fingerprint))]
  const collapsed = await collapseDuplicates(fingerprints)
  const released = await releaseOrphanedDuplicates(fingerprints)

  await markSuccess(source.id, upserted)
  await enqueueEmbeddings(rows.map((row) => row.id))
  await revalidate(rows.map((row) => row.id))

  return { sourceId: source.id, fetched: parsed.length, upserted, deactivated, collapsed, released }
}

async function enqueueEmbeddings(jobIds: string[]): Promise<void> {
  const queueUrl = process.env.EMBED_QUEUE_URL
  if (!queueUrl || jobIds.length === 0) return
  const batches: string[] = []
  for (let index = 0; index < jobIds.length; index += 50) {
    batches.push(JSON.stringify({ v: 1, jobIds: jobIds.slice(index, index + 50) }))
  }
  try {
    await sendBatch(queueUrl, batches)
  } catch {
    return
  }
}

async function revalidate(jobIds: string[]): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET
  const appUrl = process.env.APP_URL
  if (!secret || !appUrl || jobIds.length === 0) return
  try {
    await fetch(`${appUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags: ['jobs', ...jobIds.slice(0, 120).map((id) => `job:${id}`)] }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    return
  }
}

async function processRecord(record: SQSRecord): Promise<SweepOutcome> {
  const message = ingestMessageSchema.parse(JSON.parse(record.body))
  const source = findSource(message.sourceId)
  if (!source) throw new SourceFailure(`unknown source: ${message.sourceId}`)

  const maxPages = Number(process.env.INGEST_MAX_PAGES ?? 5)
  try {
    return await sweepSource(source, maxPages)
  } catch (error) {
    if (error instanceof HttpError || error instanceof SyntaxError) {
      throw new SourceFailure(error.message, { cause: error })
    }
    throw error
  }
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: { itemIdentifier: string }[] = []

  for (const record of event.Records) {
    try {
      const outcome = await processRecord(record)
      console.log(
        `${outcome.sourceId}: fetched=${outcome.fetched} upserted=${outcome.upserted} deactivated=${outcome.deactivated} collapsed=${outcome.collapsed}`,
      )
    } catch (error) {
      const sourceId = safeSourceId(record.body)
      if (error instanceof SourceFailure || error instanceof HttpError) {
        if (sourceId) await markFailure(sourceId, error)
        console.error(`source failure ${sourceId ?? 'unknown'}: ${(error as Error).message}`)
        continue
      }
      if (sourceId) await markFailure(sourceId, error).catch(() => undefined)
      console.error(`retryable failure ${sourceId ?? 'unknown'}:`, error)
      batchItemFailures.push({ itemIdentifier: record.messageId })
    }
  }

  return { batchItemFailures }
}

function safeSourceId(body: string): string | null {
  try {
    const parsed = ingestMessageSchema.safeParse(JSON.parse(body))
    return parsed.success ? parsed.data.sourceId : null
  } catch {
    return null
  }
}
