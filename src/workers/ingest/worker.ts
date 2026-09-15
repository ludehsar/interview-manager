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
  collapsedJobIds,
  deactivateStale,
  loadDescribedIds,
  releaseOrphanedDuplicates,
  toInsert,
  upsertJobs,
} from '@/domain/jobs/store'
import type { JobInsert } from '@/domain/jobs/types'
import { isSearchEnabled } from '@/search/client'
import { deleteJobDocuments, ensureJobsIndex, indexJobRows } from '@/search/jobs-index'
import { ensureSecrets } from '../secrets'
import { ingestMessageSchema } from './messages'

export type SweepOutcome = {
  sourceId: string
  fetched: number
  upserted: number
  deactivated: number
  collapsed: number
  released: number
  indexed: number
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
  const deactivated = rows.length > 0 ? await deactivateStale(source.id, sweepStartedAt) : []
  const fingerprints = [...new Set(rows.map((row) => row.fingerprint))]
  const collapsed = await collapseDuplicates(fingerprints)
  const released = await releaseOrphanedDuplicates(fingerprints)

  const indexed = await indexSweep(rows, deactivated)

  await markSuccess(source.id, upserted)
  await enqueueEmbeddings(rows.map((row) => row.id))
  await revalidate(rows.map((row) => row.id))

  return {
    sourceId: source.id,
    fetched: parsed.length,
    upserted,
    deactivated: deactivated.length,
    collapsed,
    released,
    indexed,
  }
}

async function indexSweep(rows: JobInsert[], deactivated: string[]): Promise<number> {
  if (!isSearchEnabled() || (rows.length === 0 && deactivated.length === 0)) return 0
  try {
    await ensureJobsIndex()
    const collapsed = await collapsedJobIds(rows.map((row) => row.fingerprint))
    const stale = new Set([...deactivated, ...rows.filter((row) => collapsed.has(row.id as string)).map((row) => row.id as string)])
    await deleteJobDocuments([...stale])
    return await indexJobRows(rows.filter((row) => !stale.has(row.id as string)))
  } catch (error) {
    console.error('opensearch index failed:', error)
    return 0
  }
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
  await ensureSecrets()
  const batchItemFailures: { itemIdentifier: string }[] = []

  for (const record of event.Records) {
    try {
      const outcome = await processRecord(record)
      console.log(
        `${outcome.sourceId}: fetched=${outcome.fetched} upserted=${outcome.upserted} deactivated=${outcome.deactivated} collapsed=${outcome.collapsed} indexed=${outcome.indexed}`,
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
