import { generateStructured } from '@/ai/client'
import { EXTRACT_SYSTEM, extractTask } from '@/ai/prompts/extract'
import { ExtractedResumeSchema } from '@/ai/schemas/resume-extract'
import { getObjectBytes, headObject } from '@/aws/s3'
import { dateWarnings } from './date-warnings'
import { MAX_UPLOAD_BYTES, markStatus, readUpload, storeExtraction, UPLOAD_CONTENT_TYPE } from './uploads'

export type ExtractResult = { uploadId: string; entries: number; bullets: number; warnings: string[] }

export async function extractResume(input: { uploadId: string }): Promise<ExtractResult> {
  const upload = await readUpload(input.uploadId)
  if (!upload) throw new Error('upload not found')

  try {
    await markStatus(upload.id, 'EXTRACTING')

    const head = await headObject(upload.s3Key)
    if (!head) throw new Error('the uploaded file never arrived in storage')
    if (head.bytes > MAX_UPLOAD_BYTES) throw new Error(`the file is larger than ${MAX_UPLOAD_BYTES} bytes`)
    if (head.contentType && head.contentType !== UPLOAD_CONTENT_TYPE) {
      throw new Error(`expected a PDF, got ${head.contentType}`)
    }

    const bytes = await getObjectBytes(upload.s3Key)
    const result = await generateStructured({
      route: 'resume.extract',
      tier: 'fast',
      schema: ExtractedResumeSchema,
      stableSystem: EXTRACT_SYSTEM,
      documents: [
        { mediaType: UPLOAD_CONTENT_TYPE, data: Buffer.from(bytes).toString('base64'), title: upload.fileName },
      ],
      prompt: extractTask(),
      maxTokens: 8000,
      userId: upload.userId,
    })

    const extracted = {
      ...result.data,
      warnings: [...result.data.warnings, ...dateWarnings(result.data.entries)],
    }

    await storeExtraction(upload.id, extracted)

    return {
      uploadId: upload.id,
      entries: extracted.entries.length,
      bullets: extracted.entries.reduce((total, entry) => total + entry.bullets.length, 0),
      warnings: extracted.warnings,
    }
  } catch (error) {
    await markStatus(upload.id, 'FAILED', error instanceof Error ? error.message : String(error))
    throw error
  }
}
