import { presignGet } from '@/aws/s3'
import { readResume } from '@/domain/resume/store'
import { requireUserId } from '@/lib/auth'

export async function GET(_request: Request, { params }: RouteContext<'/api/resumes/[id]/pdf'>) {
  const userId = await requireUserId()
  const { id } = await params

  const resume = await readResume(userId, id)
  if (!resume) return Response.json({ error: 'not found' }, { status: 404 })
  if (!resume.pdfKey) return Response.json({ error: 'this resume has not been rendered yet' }, { status: 409 })

  return Response.redirect(await presignGet(resume.pdfKey, 300), 302)
}
