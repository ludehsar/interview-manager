import { generateStructured } from '@/ai/client'
import { RUBRIC_BLOCK } from '@/ai/prompts/rubric'
import { SCREEN_ROLE, SCREEN_TASK } from '@/ai/prompts/screen'
import { ScreenerSchema } from '@/ai/schemas/screener'
import { ResumeDocumentSchema } from '@/ai/schemas/resume'
import { serializeResume } from '../document'
import { serializeEvidencePack } from '../evidence'
import { toScreenerReport, type ScreenerReport } from '../screener'
import { advanceRun, readResume, saveResumeScores } from '../store'
import type { PipelineState } from '../types'
import { loadEvidence } from './guard'

export async function screenStep(state: PipelineState): Promise<PipelineState & { report: ScreenerReport }> {
  await advanceRun(state.runId, 'screen')

  if (!state.resumeId) throw new Error('screen ran before a draft existed')

  const row = await readResume(state.userId, state.resumeId)
  if (!row) throw new Error('resume not found')

  const doc = ResumeDocumentSchema.parse(row.content)
  const { pack, evidenceKey } = await loadEvidence(state)

  const result = await generateStructured({
    route: 'resume.screen',
    tier: 'reason',
    effort: 'high',
    schema: ScreenerSchema,
    stableSystem: RUBRIC_BLOCK,
    cachedContext: serializeEvidencePack(pack),
    cacheTtl: '1h',
    prompt: `${SCREEN_ROLE}\n\n${SCREEN_TASK}\n\n${serializeResume(doc)}`,
    maxTokens: 8000,
    userId: state.userId,
  })

  const report = toScreenerReport(result.data)

  await saveResumeScores(state.resumeId, {
    screenerScore: report.score,
    screenerReport: report as unknown as Record<string, unknown>,
  })
  await advanceRun(state.runId, 'screen', {
    screenerScore: report.score,
    verdict: report.verdict,
    screenCacheHit: result.cacheHit,
    screenUsd: result.usage.usd,
  })

  return { ...state, evidenceKey, screenerScore: report.score, report }
}
