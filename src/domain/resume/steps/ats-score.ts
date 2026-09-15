import { getObjectBytes } from '@/aws/s3'
import { ResumeDocumentSchema } from '@/ai/schemas/resume'
import { extractPdfText, keywordsFromDocument, scoreAts, type AtsReport } from '../ats'
import { advanceRun, readResume, saveResumeScores } from '../store'
import type { PipelineState } from '../types'

export async function atsScoreStep(state: PipelineState): Promise<PipelineState & { report: AtsReport }> {
  await advanceRun(state.runId, 'ats-score')

  if (!state.resumeId || !state.pdfKey) throw new Error('ats-score ran before a PDF existed')

  const row = await readResume(state.userId, state.resumeId)
  if (!row) throw new Error('resume not found')

  const doc = ResumeDocumentSchema.parse(row.content)
  const bytes = await getObjectBytes(state.pdfKey)
  const pdfText = await extractPdfText(bytes)

  const report = scoreAts({ pdfText, doc, keywords: keywordsFromDocument(doc) })

  await saveResumeScores(state.resumeId, {
    atsScore: report.score,
    atsReport: report as unknown as Record<string, unknown>,
  })
  await advanceRun(state.runId, 'ats-score', {
    atsScore: report.score,
    atsIssues: report.issues.map((issue) => issue.code),
    parsedChars: report.parsedChars,
  })

  return { ...state, atsScore: report.score, report }
}
