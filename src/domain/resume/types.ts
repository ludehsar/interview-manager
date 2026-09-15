export type ResumeKind = 'MASTER' | 'TAILORED'

export type PipelineState = {
  runId: string
  userId: string
  kind: ResumeKind
  resumeId: string | null
  jobId: string | null
  uploadId: string | null
  evidenceKey: string | null
  promptVersion: string
  loop: number
  guardOk: boolean
  guardErrors: number
  screenerScore: number | null
  atsScore: number | null
  pdfKey: string | null
  typstKey: string | null
}

export type Step = (state: PipelineState) => Promise<PipelineState>

export const PIPELINE_STEPS = [
  'extract',
  'kg-build',
  'draft',
  'guard',
  'screen',
  'revise',
  'render',
  'ats-score',
  'persist',
] as const

export type PipelineStep = (typeof PIPELINE_STEPS)[number]

export function targetScore(): number {
  const value = Number(process.env.RESUME_TARGET_SCORE ?? 85)
  return Number.isFinite(value) ? value : 85
}

export function maxRevisions(): number {
  const value = Number(process.env.RESUME_MAX_REVISIONS ?? 2)
  return Number.isFinite(value) ? value : 2
}

export function evidenceKeyFor(runId: string): string {
  return `resume-runs/${runId}/evidence.json`
}

export function pdfKeyFor(userId: string, resumeId: string): string {
  return `pdf/${userId}/${resumeId}.pdf`
}

export function typstKeyFor(userId: string, resumeId: string): string {
  return `typst/${userId}/${resumeId}.typ`
}
