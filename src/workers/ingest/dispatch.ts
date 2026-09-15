import { SOURCES } from '@/adapters/sources'
import { sendBatch } from '@/aws/sqs'
import { dueSources, markRunStart, seedSourceState } from '@/domain/jobs/source-state'
import { newId } from '@/lib/ids'
import { ensureSecrets } from '../secrets'
import { dispatchEventSchema, type DispatchEvent } from './messages'

export type DispatchResult = {
  enqueued: number
  skipped: number
  disabled: number
  runId: string
}

export async function dispatch(event: DispatchEvent = {}): Promise<DispatchResult> {
  const queueUrl = process.env.INGEST_QUEUE_URL
  if (!queueUrl) throw new Error('INGEST_QUEUE_URL is not set')

  const runId = newId('run')
  const candidates = SOURCES.filter((source) => {
    if (!source.enabled) return false
    if (event.tier && source.tier !== event.tier) return false
    if (event.sourceIds?.length && !event.sourceIds.includes(source.id)) return false
    return true
  })

  await seedSourceState(candidates)
  const { due, skipped, disabled } = await dueSources(candidates, new Date(), event.force ?? false)

  for (const source of due) {
    await markRunStart(source)
  }

  const enqueued = await sendBatch(
    queueUrl,
    due.map((source) =>
      JSON.stringify({ v: 1, sourceId: source.id, runId, requestedAt: new Date().toISOString() }),
    ),
  )

  return { enqueued, skipped, disabled, runId }
}

export const handler = async (event: unknown = {}): Promise<DispatchResult> => {
  await ensureSecrets()
  return dispatch(dispatchEventSchema.parse(event ?? {}))
}
