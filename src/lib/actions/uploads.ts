'use server'

import { z } from 'zod'
import { startExecution } from '@/aws/sfn'
import { extractResume } from '@/domain/profile/extract'
import {
  acceptExtraction,
  discardUpload,
  markStatus,
  readUpload,
  type UploadStatus,
} from '@/domain/profile/uploads'
import { requireUserId } from '@/lib/auth'

const indexesSchema = z.array(z.number().int().min(0).max(59)).max(60)

export async function confirmUpload(uploadId: string): Promise<{ status: UploadStatus }> {
  const userId = await requireUserId()
  const upload = await readUpload(uploadId, userId)
  if (!upload) throw new Error('upload not found')

  await markStatus(upload.id, 'EXTRACTING')

  const stateMachineArn = process.env.RESUME_STATE_MACHINE_ARN
  if (stateMachineArn) {
    await startExecution(stateMachineArn, `extract-${upload.id}`, {
      kind: 'EXTRACT_ONLY',
      uploadId: upload.id,
      userId,
    })
    return { status: 'EXTRACTING' }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    await extractResume({ uploadId: upload.id })
    return { status: 'EXTRACTED' }
  }

  return { status: 'EXTRACTING' }
}

export async function acceptUpload(
  uploadId: string,
  entryIndexes: number[],
): Promise<{ created: number; basicsFilled: string[] }> {
  const userId = await requireUserId()
  return acceptExtraction(userId, uploadId, indexesSchema.parse(entryIndexes))
}

export async function removeUpload(uploadId: string): Promise<void> {
  const userId = await requireUserId()
  await discardUpload(userId, uploadId)
}
