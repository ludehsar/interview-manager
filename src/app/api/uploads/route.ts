import { z } from 'zod'
import { presignPut } from '@/aws/s3'
import { createUpload, MAX_UPLOAD_BYTES, UPLOAD_CONTENT_TYPE } from '@/domain/profile/uploads'
import { requireUserId } from '@/lib/auth'

const bodySchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.literal(UPLOAD_CONTENT_TYPE),
  bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
})

export async function POST(request: Request) {
  const userId = await requireUserId()

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Upload a PDF smaller than 10 MB' }, { status: 400 })
  }

  const upload = await createUpload({ userId, ...parsed.data })
  const url = await presignPut(upload.s3Key, parsed.data.contentType, {
    expiresIn: 300,
    contentLength: parsed.data.bytes,
  })

  return Response.json({ uploadId: upload.id, key: upload.s3Key, url })
}
