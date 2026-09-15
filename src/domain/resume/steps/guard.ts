import { getObjectJson, putJson } from '@/aws/s3'
import { ResumeDocumentSchema } from '@/ai/schemas/resume'
import { buildEvidencePack, type EvidencePack } from '../evidence'
import { guardResume, type GuardReport } from '../guard'
import { advanceRun, readResume } from '../store'
import { evidenceKeyFor, type PipelineState } from '../types'

export async function loadEvidence(state: PipelineState): Promise<{ pack: EvidencePack; evidenceKey: string }> {
  if (state.evidenceKey) {
    return { pack: await getObjectJson<EvidencePack>(state.evidenceKey), evidenceKey: state.evidenceKey }
  }

  const pack = await buildEvidencePack({ userId: state.userId })
  const evidenceKey = evidenceKeyFor(state.runId)
  await putJson(evidenceKey, pack)
  return { pack, evidenceKey }
}

export async function guardStep(state: PipelineState): Promise<PipelineState & { report: GuardReport }> {
  await advanceRun(state.runId, 'guard')

  if (!state.resumeId) throw new Error('guard ran before a draft existed')

  const row = await readResume(state.userId, state.resumeId)
  if (!row) throw new Error('resume not found')

  const doc = ResumeDocumentSchema.parse(row.content)
  const { pack, evidenceKey } = await loadEvidence(state)
  const report = guardResume(doc, pack)

  await advanceRun(state.runId, 'guard', {
    guardErrors: report.errors,
    guardWarnings: report.warnings,
    guardCodes: report.violations.map((violation) => violation.code),
  })

  return { ...state, evidenceKey, guardOk: report.ok, guardErrors: report.errors, report }
}
