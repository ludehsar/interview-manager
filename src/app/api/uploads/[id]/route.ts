import { readUpload } from '@/domain/profile/uploads'
import { requireUserId } from '@/lib/auth'

export async function GET(_request: Request, { params }: RouteContext<'/api/uploads/[id]'>) {
  const userId = await requireUserId()
  const { id } = await params

  const upload = await readUpload(id, userId)
  if (!upload) return Response.json({ error: 'not found' }, { status: 404 })

  return Response.json({
    uploadId: upload.id,
    fileName: upload.fileName,
    status: upload.status,
    error: upload.error,
    entries: upload.extracted?.entries.length ?? 0,
    warnings: upload.extracted?.warnings ?? [],
  })
}
