import { eq } from 'drizzle-orm'
import { generateStructured } from '@/ai/client'
import { REMOTE_REGION_SYSTEM, RemoteRegionSchema } from '@/ai/schemas/remote-region'
import { db } from '@/db/client'
import { locationRegions } from '@/db/schema'
import { serverEnv } from '@/env'
import { classifyByRules, normalizeLocation, UNKNOWN_VERDICT, type RegionVerdict } from './remote-region'

const memo = new Map<string, RegionVerdict>()

export async function classifyRegion(raw: string | null | undefined, hint?: string): Promise<RegionVerdict> {
  const normalized = normalizeLocation(raw)
  if (!normalized) return UNKNOWN_VERDICT

  const cached = memo.get(normalized)
  if (cached) return cached

  const byRules = classifyByRules(normalized)
  if (byRules) {
    memo.set(normalized, byRules)
    void persist(normalized, byRules)
    return byRules
  }

  const stored = await db()
    .select()
    .from(locationRegions)
    .where(eq(locationRegions.normalized, normalized))
    .limit(1)
  const row = stored[0]
  if (row) {
    const verdict: RegionVerdict = {
      region: row.region,
      countries: row.countries,
      origin: row.origin === 'llm' ? 'llm' : 'rule',
    }
    memo.set(normalized, verdict)
    return verdict
  }

  if (!serverEnv().LOCATION_LLM_FALLBACK) {
    memo.set(normalized, UNKNOWN_VERDICT)
    return UNKNOWN_VERDICT
  }

  const verdict = await classifyByModel(normalized, hint)
  memo.set(normalized, verdict)
  await persist(normalized, verdict)
  return verdict
}

async function classifyByModel(normalized: string, hint?: string): Promise<RegionVerdict> {
  try {
    const result = await generateStructured({
      route: 'jobs.remote-region',
      tier: 'fast',
      schema: RemoteRegionSchema,
      stableSystem: REMOTE_REGION_SYSTEM,
      prompt: hint ? `location: ${normalized}\ncontext: ${hint.slice(0, 400)}` : `location: ${normalized}`,
      effort: 'low',
      maxTokens: 300,
    })
    return {
      region: result.data.region,
      countries: result.data.countries.map((code) => code.toUpperCase()),
      origin: 'llm',
    }
  } catch {
    return UNKNOWN_VERDICT
  }
}

async function persist(normalized: string, verdict: RegionVerdict): Promise<void> {
  if (verdict.origin === 'default') return
  try {
    await db()
      .insert(locationRegions)
      .values({
        normalized,
        region: verdict.region,
        countries: verdict.countries,
        origin: verdict.origin,
      })
      .onConflictDoNothing()
  } catch {
    return
  }
}

export function resetRegionMemo(): void {
  memo.clear()
}
