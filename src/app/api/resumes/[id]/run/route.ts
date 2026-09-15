import { latestRun } from '@/domain/resume/store'
import { requireUserId } from '@/lib/auth'

export async function GET(_request: Request, { params }: RouteContext<'/api/resumes/[id]/run'>) {
  const userId = await requireUserId()
  const { id } = await params

  const run = await latestRun(userId, id === 'latest' ? undefined : id)
  if (!run) return Response.json({ run: null })

  return Response.json({
    run: {
      runId: run.id,
      resumeId: run.resumeId,
      step: run.step,
      status: run.status,
      error: run.error,
      metrics: run.metrics,
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
    },
  })
}
