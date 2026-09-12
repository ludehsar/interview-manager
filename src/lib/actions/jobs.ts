'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { jobs, userJobs } from '@/db/schema'
import { requireUserId } from '@/lib/auth'

export type JobState = 'SAVED' | 'DISMISSED' | 'APPLIED'

export async function setJobState(jobId: string, state: JobState | null): Promise<{ state: JobState | null }> {
  const userId = await requireUserId()

  if (state === null) {
    await db().delete(userJobs).where(and(eq(userJobs.userId, userId), eq(userJobs.jobId, jobId)))
    return { state: null }
  }

  const exists = await db().select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1)
  if (exists.length === 0) throw new Error('job not found')

  await db()
    .insert(userJobs)
    .values({ userId, jobId, state })
    .onConflictDoUpdate({
      target: [userJobs.userId, userJobs.jobId],
      set: { state, updatedAt: new Date() },
    })

  return { state }
}
