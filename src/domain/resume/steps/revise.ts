import { generateStructured } from '@/ai/client'
import { REVISE_ROLE, reviseTask } from '@/ai/prompts/revise'
import { RUBRIC_BLOCK } from '@/ai/prompts/rubric'
import { ReviseSchema } from '@/ai/schemas/revise'
import { ResumeDocumentSchema } from '@/ai/schemas/resume'
import { serializeResume } from '../document'
import { serializeEvidencePack } from '../evidence'
import { guardResume } from '../guard'
import { applySafeEdits, withSummary } from '../revise'
import { weakestCriteria, type ScreenerReport } from '../screener'
import { advanceRun, readResume, saveResumeScores } from '../store'
import { targetScore, type PipelineState } from '../types'
import { draftStep } from './draft'
import { loadEvidence } from './guard'

export async function reviseStep(state: PipelineState): Promise<PipelineState> {
  const loop = state.loop + 1

  if (!state.resumeId) throw new Error('revise ran before a draft existed')

  const { pack, evidenceKey } = await loadEvidence(state)
  const row = await readResume(state.userId, state.resumeId)
  if (!row) throw new Error('resume not found')

  const doc = ResumeDocumentSchema.parse(row.content)

  if (!state.guardOk) {
    const report = guardResume(doc, pack)
    const repaired = await draftStep({ ...state, evidenceKey }, { violations: report.violations, step: 'revise' })
    return { ...repaired, loop }
  }

  await advanceRun(state.runId, 'revise')

  const screener = (row.screenerReport ?? {}) as Partial<ScreenerReport>
  const result = await generateStructured({
    route: 'resume.revise',
    tier: 'reason',
    effort: 'medium',
    schema: ReviseSchema,
    stableSystem: RUBRIC_BLOCK,
    cachedContext: serializeEvidencePack(pack),
    cacheTtl: '1h',
    prompt: `${REVISE_ROLE}\n\n${reviseTask({
      score: state.screenerScore ?? screener.score ?? 0,
      target: targetScore(),
      verdict: screener.verdict ?? 'MAYBE',
      weakest: weakestCriteria({ ...screener, rubric: screener.rubric ?? [] } as ScreenerReport),
      bullets: (screener.perBullet ?? [])
        .filter((bullet) => bullet.issue !== 'NONE')
        .sort((a, b) => a.score - b.score)
        .slice(0, 15),
      redFlags: screener.redFlags ?? [],
    })}\n\n${serializeResume(doc)}`,
    maxTokens: 12000,
    userId: state.userId,
  })

  const safe = applySafeEdits(doc, result.data.edits, pack)
  const content = withSummary(safe.doc, result.data.summary, pack)

  await saveResumeScores(state.resumeId, { content })
  await advanceRun(state.runId, 'revise', {
    loop,
    editsApplied: safe.applied.length,
    editsRejected: safe.rejected.length,
    reviseCacheHit: result.cacheHit,
    reviseUsd: result.usage.usd,
  })

  return { ...state, evidenceKey, loop }
}
