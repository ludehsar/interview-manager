import { generateStructured } from '@/ai/client'
import { DRAFT_ROLE, DRAFT_TASK, repairTask } from '@/ai/prompts/draft'
import { RUBRIC_BLOCK } from '@/ai/prompts/rubric'
import { ResumeDraftSchema } from '@/ai/schemas/draft'
import { materializeDocument } from '../document'
import { serializeEvidencePack } from '../evidence'
import type { GuardViolation } from '../guard'
import { advanceRun, saveResumeScores, upsertMasterResume } from '../store'
import type { PipelineState } from '../types'
import { loadEvidence } from './guard'

export async function draftStep(
  state: PipelineState,
  options?: { violations?: GuardViolation[]; step?: string },
): Promise<PipelineState> {
  const step = options?.step ?? 'draft'
  await advanceRun(state.runId, step)

  if (state.kind === 'TAILORED') throw new Error('tailored builds land in Phase 4')

  const { pack, evidenceKey } = await loadEvidence(state)
  if (pack.entries.length === 0) throw new Error('the profile has no entries to write a resume from')

  const violations = (options?.violations ?? []).filter((violation) => violation.severity === 'error')

  const result = await generateStructured({
    route: violations.length > 0 ? 'resume.repair' : 'resume.draft',
    tier: 'reason',
    effort: 'high',
    schema: ResumeDraftSchema,
    stableSystem: RUBRIC_BLOCK,
    cachedContext: serializeEvidencePack(pack),
    cacheTtl: '1h',
    prompt: `${DRAFT_ROLE}\n\n${violations.length > 0 ? repairTask({ violations }) : DRAFT_TASK}`,
    maxTokens: 16000,
    userId: state.userId,
  })

  const content = materializeDocument(result.data, pack)

  const resumeId = state.resumeId
    ? state.resumeId
    : await upsertMasterResume({
        userId: state.userId,
        title: content.basics.headline || 'Master resume',
        content,
        promptVersion: state.promptVersion,
      })

  if (state.resumeId) {
    await saveResumeScores(resumeId, { content })
  }

  await advanceRun(state.runId, step, {
    [`${step}CacheHit`]: result.cacheHit,
    [`${step}Usd`]: result.usage.usd,
    entries: content.sections.reduce((total, section) => total + section.entries.length, 0),
    bullets: content.sections.reduce(
      (total, section) => total + section.entries.reduce((count, entry) => count + entry.bullets.length, 0),
      0,
    ),
  })

  return { ...state, resumeId, evidenceKey }
}
