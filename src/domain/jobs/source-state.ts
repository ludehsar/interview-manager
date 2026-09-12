import { eq, sql } from 'drizzle-orm'
import type { SourceDefinition } from '@/adapters/types'
import { db } from '@/db/client'
import { jobSourceState } from '@/db/schema'

const MAX_CONSECUTIVE_FAILURES = 5

export type SourceStateRow = typeof jobSourceState.$inferSelect

export async function seedSourceState(sources: SourceDefinition[]): Promise<number> {
  if (sources.length === 0) return 0
  await db()
    .insert(jobSourceState)
    .values(
      sources.map((source) => ({
        sourceId: source.id,
        kind: source.kind,
        tier: source.tier,
      })),
    )
    .onConflictDoUpdate({
      target: jobSourceState.sourceId,
      set: { kind: sql`excluded.kind`, tier: sql`excluded.tier` },
    })
  return sources.length
}

export async function loadSourceState(): Promise<Map<string, SourceStateRow>> {
  const rows = await db().select().from(jobSourceState)
  return new Map(rows.map((row) => [row.sourceId, row]))
}

export async function dueSources(
  sources: SourceDefinition[],
  now: Date,
  force = false,
): Promise<{ due: SourceDefinition[]; skipped: number; disabled: number }> {
  const state = await loadSourceState()
  const due: SourceDefinition[] = []
  let skipped = 0
  let disabled = 0

  for (const source of sources) {
    const row = state.get(source.id)
    if (row?.disabled) {
      disabled += 1
      continue
    }
    if (!force && row?.lastRunAt) {
      const elapsedMinutes = (now.getTime() - row.lastRunAt.getTime()) / 60000
      if (elapsedMinutes < source.intervalMinutes) {
        skipped += 1
        continue
      }
    }
    due.push(source)
  }

  return { due, skipped, disabled }
}

export async function markRunStart(source: SourceDefinition): Promise<void> {
  await db()
    .insert(jobSourceState)
    .values({
      sourceId: source.id,
      kind: source.kind,
      tier: source.tier,
      lastRunAt: new Date(),
      lastStatus: 'running',
    })
    .onConflictDoUpdate({
      target: jobSourceState.sourceId,
      set: { lastRunAt: sql`excluded.last_run_at`, lastStatus: sql`excluded.last_status` },
    })
}

export async function markSuccess(sourceId: string, jobCount: number): Promise<void> {
  await db()
    .update(jobSourceState)
    .set({
      lastSuccessAt: new Date(),
      lastStatus: 'ok',
      lastError: null,
      lastJobCount: jobCount,
      consecutiveFailures: 0,
      disabled: false,
    })
    .where(eq(jobSourceState.sourceId, sourceId))
}

export async function markFailure(sourceId: string, error: unknown): Promise<{ disabled: boolean }> {
  const message = error instanceof Error ? error.message : String(error)
  const rows = await db()
    .update(jobSourceState)
    .set({
      consecutiveFailures: sql`${jobSourceState.consecutiveFailures} + 1`,
      disabled: sql`${jobSourceState.consecutiveFailures} + 1 >= ${MAX_CONSECUTIVE_FAILURES}`,
      lastStatus: 'error',
      lastError: message.slice(0, 500),
    })
    .where(eq(jobSourceState.sourceId, sourceId))
    .returning({ disabled: jobSourceState.disabled })
  return { disabled: rows[0]?.disabled ?? false }
}

export async function enableSource(sourceId: string): Promise<void> {
  await db()
    .update(jobSourceState)
    .set({ disabled: false, consecutiveFailures: 0, lastError: null })
    .where(eq(jobSourceState.sourceId, sourceId))
}
