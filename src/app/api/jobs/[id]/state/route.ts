import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { userJobs } from '@/db/schema'
import { optionalUserId } from '@/lib/auth'

export async function GET(_request: Request, { params }: RouteContext<'/api/jobs/[id]/state'>) {
  const { id } = await params
  const userId = await optionalUserId()
  if (!userId) return Response.json({ state: null })

  const rows = await db()
    .select({ state: userJobs.state })
    .from(userJobs)
    .where(and(eq(userJobs.userId, userId), eq(userJobs.jobId, id)))
    .limit(1)

  return Response.json({ state: rows[0]?.state ?? null })
}
