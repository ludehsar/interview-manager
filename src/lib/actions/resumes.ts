'use server'

import { startExecution } from '@/aws/sfn'
import { PROMPT_VERSION } from '@/ai/prompts/version'
import { ResumeDocumentSchema, type ResumeDocument } from '@/ai/schemas/resume'
import { buildEvidencePack } from '@/domain/resume/evidence'
import { guardResume } from '@/domain/resume/guard'
import { renderStep } from '@/domain/resume/steps/render'
import { atsScoreStep } from '@/domain/resume/steps/ats-score'
import { persistStep } from '@/domain/resume/steps/persist'
import { attachExecution, failRun, initialState, readResume, saveResumeScores, startRun } from '@/domain/resume/store'
import { requireUserId } from '@/lib/auth'

export async function buildMasterResume(): Promise<{ runId: string; started: boolean }> {
  const userId = await requireUserId()
  const runId = await startRun({ userId, kind: 'MASTER', step: 'queued' })

  const arn = process.env.RESUME_STATE_MACHINE_ARN
  if (!arn) {
    await failRun(runId, 'queued', 'RESUME_STATE_MACHINE_ARN is not set, so no pipeline picked this build up')
    return { runId, started: false }
  }

  const executionArn = await startExecution(arn, `master-${runId}`, {
    ...initialState({ runId, userId, kind: 'MASTER', promptVersion: PROMPT_VERSION }),
  })
  await attachExecution(runId, executionArn)

  return { runId, started: true }
}

export async function saveResumeSections(resumeId: string, doc: ResumeDocument): Promise<{ ok: true }> {
  const userId = await requireUserId()

  const row = await readResume(userId, resumeId)
  if (!row) throw new Error('resume not found')

  const content = ResumeDocumentSchema.parse(doc)
  const report = guardResume(content, await buildEvidencePack({ userId }))
  if (!report.ok) {
    const first = report.violations.find((violation) => violation.severity === 'error')
    throw new Error(first ? `${first.code}: ${first.message}` : 'the edit failed the fabrication guard')
  }

  await saveResumeScores(resumeId, { content })
  return { ok: true }
}

export async function rerenderResume(resumeId: string): Promise<{ runId: string; atsScore: number | null }> {
  const userId = await requireUserId()

  const row = await readResume(userId, resumeId)
  if (!row) throw new Error('resume not found')

  const runId = await startRun({ userId, kind: row.kind, resumeId, step: 'render' })
  const base = { ...initialState({ runId, userId, kind: row.kind, promptVersion: row.promptVersion }), resumeId }

  const rendered = await renderStep(base)
  const scored = await atsScoreStep(rendered)
  await persistStep(scored)

  return { runId, atsScore: scored.atsScore }
}
