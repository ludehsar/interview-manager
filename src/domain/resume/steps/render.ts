import { invokeJson } from '@/aws/lambda'
import { bucket } from '@/aws/s3'
import { ResumeDocumentSchema } from '@/ai/schemas/resume'
import { renderLocally, type RenderOutput } from '../render-local'
import { advanceRun, readResume, saveResumeScores } from '../store'
import { pdfKeyFor, typstKeyFor, type PipelineState } from '../types'

export async function renderStep(state: PipelineState): Promise<PipelineState> {
  await advanceRun(state.runId, 'render')

  if (!state.resumeId) throw new Error('render ran before a draft existed')

  const row = await readResume(state.userId, state.resumeId)
  if (!row) throw new Error('resume not found')

  const content = ResumeDocumentSchema.parse(row.content)
  const pdfKey = pdfKeyFor(state.userId, state.resumeId)
  const typstKey = typstKeyFor(state.userId, state.resumeId)

  const arn = process.env.RENDER_FUNCTION_ARN
  const output: RenderOutput = arn
    ? await invokeJson<{ pdf_key: string; typst_key: string; page_count: number; bytes: number }>(arn, {
        resume_id: state.resumeId,
        template: 'ats',
        content,
        bucket: bucket(),
        pdf_key: pdfKey,
        typst_key: typstKey,
      }).then((result) => ({
        pdfKey: result.pdf_key,
        typstKey: result.typst_key,
        pageCount: result.page_count,
        bytes: result.bytes,
      }))
    : await renderLocally({ content, pdfKey, typstKey })

  await saveResumeScores(state.resumeId, { pdfKey: output.pdfKey, typstKey: output.typstKey })
  await advanceRun(state.runId, 'render', { pageCount: output.pageCount, pdfBytes: output.bytes })

  return { ...state, pdfKey: output.pdfKey, typstKey: output.typstKey }
}
