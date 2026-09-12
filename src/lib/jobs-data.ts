import { unstable_cache } from 'next/cache'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { jobs, userJobs } from '@/db/schema'
import { loadFacets, recentActiveJobIds, type JobFacets, type JobFilters } from '@/domain/jobs/search'
import type { JobRow } from '@/domain/jobs/types'

export const JOBS_TAG = 'jobs'

export function jobTag(id: string): string {
  return `job:${id}`
}

async function readJob(id: string): Promise<JobRow | null> {
  const rows = await db().select().from(jobs).where(eq(jobs.id, id)).limit(1)
  return rows[0] ?? null
}

const DATE_FIELDS = ['postedAt', 'firstSeenAt', 'lastSeenAt', 'closedAt', 'embeddedAt'] as const

function reviveDates(job: JobRow | null): JobRow | null {
  if (!job) return null
  const revived = { ...job } as Record<string, unknown>
  for (const field of DATE_FIELDS) {
    const value = revived[field]
    if (typeof value === 'string') revived[field] = new Date(value)
  }
  return revived as JobRow
}

export async function getPublicJob(id: string): Promise<JobRow | null> {
  const cached = await unstable_cache(() => readJob(id), ['public-job', id], {
    tags: [JOBS_TAG, jobTag(id)],
    revalidate: 3600,
  })()
  return reviveDates(cached)
}

export function getCachedFacets(filters: JobFilters, key: string): Promise<JobFacets> {
  return unstable_cache(() => loadFacets(filters), ['job-facets', key], {
    tags: [JOBS_TAG],
    revalidate: 300,
  })()
}

export function getStaticJobIds(limit = 200): Promise<string[]> {
  return unstable_cache(() => recentActiveJobIds(limit), ['job-ids', String(limit)], {
    tags: [JOBS_TAG],
    revalidate: 3600,
  })()
}

export async function getRelatedJobs(job: JobRow, limit = 6) {
  return db()
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      locationRaw: jobs.locationRaw,
      remoteRegion: jobs.remoteRegion,
      postedAt: jobs.postedAt,
    })
    .from(jobs)
    .where(and(eq(jobs.company, job.company), eq(jobs.isActive, true)))
    .orderBy(desc(jobs.postedAt))
    .limit(limit + 1)
    .then((rows) => rows.filter((row) => row.id !== job.id).slice(0, limit))
}

export async function getUserJobStates(userId: string, jobIds: string[]) {
  if (jobIds.length === 0) return new Map<string, string>()
  const rows = await db()
    .select({ jobId: userJobs.jobId, state: userJobs.state })
    .from(userJobs)
    .where(and(eq(userJobs.userId, userId), inArray(userJobs.jobId, jobIds)))
  return new Map(rows.map((row) => [row.jobId, row.state]))
}

export async function getSavedJobs(userId: string, state?: 'SAVED' | 'APPLIED' | 'DISMISSED', limit = 100) {
  const condition = state
    ? and(eq(userJobs.userId, userId), eq(userJobs.state, state))
    : eq(userJobs.userId, userId)

  return db()
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      companyDomain: jobs.companyDomain,
      locationRaw: jobs.locationRaw,
      remoteRegion: jobs.remoteRegion,
      employmentType: jobs.employmentType,
      seniority: jobs.seniority,
      skills: jobs.skills,
      salaryMinUsdMonth: jobs.salaryMinUsdMonth,
      salaryMaxUsdMonth: jobs.salaryMaxUsdMonth,
      tier: jobs.tier,
      excerpt: jobs.excerpt,
      applyUrl: jobs.applyUrl,
      postedAt: jobs.postedAt,
      isActive: jobs.isActive,
      state: userJobs.state,
      updatedAt: userJobs.updatedAt,
    })
    .from(userJobs)
    .innerJoin(jobs, eq(jobs.id, userJobs.jobId))
    .where(condition)
    .orderBy(desc(userJobs.updatedAt))
    .limit(limit)
}

export type UserJobCounts = { saved: number; applied: number; dismissed: number }

export async function getUserJobCounts(userId: string): Promise<UserJobCounts> {
  const rows = await db()
    .select({ state: userJobs.state, count: sql<number>`count(*)::int` })
    .from(userJobs)
    .where(eq(userJobs.userId, userId))
    .groupBy(userJobs.state)

  const counts: UserJobCounts = { saved: 0, applied: 0, dismissed: 0 }
  for (const row of rows) {
    if (row.state === 'SAVED') counts.saved = row.count
    if (row.state === 'APPLIED') counts.applied = row.count
    if (row.state === 'DISMISSED') counts.dismissed = row.count
  }
  return counts
}

export type BoardStats = {
  activeJobs: number
  companies: number
  addedThisWeek: number
  worldwide: number
}

export async function getBoardStats(): Promise<BoardStats> {
  return unstable_cache(
    async () => {
      const result = await db().execute(sql`
        select
          count(*)::int as active_jobs,
          count(distinct company)::int as companies,
          count(*) filter (where first_seen_at >= now() - interval '7 days')::int as added_this_week,
          count(*) filter (where remote_region = 'WORLDWIDE')::int as worldwide
        from jobs
        where is_active and canonical_job_id is null
      `)
      const rows = (result.rows ?? result) as unknown as {
        active_jobs: number
        companies: number
        added_this_week: number
        worldwide: number
      }[]
      const row = rows[0]
      return {
        activeJobs: row?.active_jobs ?? 0,
        companies: row?.companies ?? 0,
        addedThisWeek: row?.added_this_week ?? 0,
        worldwide: row?.worldwide ?? 0,
      }
    },
    ['board-stats'],
    { tags: [JOBS_TAG], revalidate: 300 },
  )()
}

export type MonthlyPoint = { month: string; posted: number; worldwide: number }

export async function getMonthlyPostings(months = 8): Promise<MonthlyPoint[]> {
  return unstable_cache(
    async () => {
      const result = await db().execute(sql`
        select
          to_char(date_trunc('month', sort_at), 'Mon') as month,
          date_trunc('month', sort_at) as bucket,
          count(*)::int as posted,
          count(*) filter (where remote_region in ('WORLDWIDE', 'APAC'))::int as worldwide
        from jobs
        where is_active
          and canonical_job_id is null
          and sort_at >= date_trunc('month', now()) - make_interval(months => ${months - 1})
        group by 1, 2
        order by bucket asc
      `)
      const rows = (result.rows ?? result) as unknown as MonthlyPoint[]
      return rows.map((row) => ({ month: row.month, posted: row.posted, worldwide: row.worldwide }))
    },
    ['monthly-postings', String(months)],
    { tags: [JOBS_TAG], revalidate: 3600 },
  )()
}

export async function getTopCompanies(limit = 6) {
  return unstable_cache(
    async () => {
      const result = await db().execute(sql`
        select company, max(company_domain) as company_domain, count(*)::int as openings
        from jobs
        where is_active and canonical_job_id is null
        group by company
        order by openings desc, company asc
        limit ${limit}
      `)
      return (result.rows ?? result) as unknown as {
        company: string
        company_domain: string | null
        openings: number
      }[]
    },
    ['top-companies', String(limit)],
    { tags: [JOBS_TAG], revalidate: 3600 },
  )()
}
