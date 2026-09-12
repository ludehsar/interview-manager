import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { jobs } from '@/db/schema'
import type { JobInsert, NormalizedJob } from './types'

const CHUNK_SIZE = 200

export function toInsert(job: NormalizedJob, seenAt: Date): JobInsert {
  return {
    id: job.id,
    sourceId: job.sourceId,
    sourceKind: job.sourceKind,
    tier: job.tier,
    externalId: job.externalId,
    title: job.title,
    company: job.company,
    companyDomain: job.companyDomain,
    locationRaw: job.locationRaw,
    remoteRegion: job.remoteRegion,
    countries: job.countries,
    cities: job.cities,
    workplaceType: job.workplaceType,
    discipline: job.discipline,
    employmentType: job.employmentType,
    seniority: job.seniority,
    roleType: job.roleType,
    skills: job.skills,
    salaryMinUsdMonth: job.salaryMinUsdMonth,
    salaryMaxUsdMonth: job.salaryMaxUsdMonth,
    salaryRaw: job.salaryRaw,
    descriptionText: job.descriptionText,
    excerpt: job.excerpt,
    applyUrl: job.applyUrl,
    atsKind: job.atsKind,
    postedAt: job.postedAt,
    fingerprint: job.fingerprint,
    contentHash: job.contentHash,
    firstSeenAt: seenAt,
    lastSeenAt: seenAt,
    isActive: true,
    closedAt: null,
  }
}

export const UPSERT_SET = {
  title: sql`excluded.title`,
  company: sql`excluded.company`,
  companyDomain: sql`excluded.company_domain`,
  locationRaw: sql`coalesce(excluded.location_raw, ${jobs.locationRaw})`,
  remoteRegion: sql`excluded.remote_region`,
  countries: sql`excluded.countries`,
  cities: sql`excluded.cities`,
  workplaceType: sql`excluded.workplace_type`,
  discipline: sql`excluded.discipline`,
  employmentType: sql`excluded.employment_type`,
  seniority: sql`excluded.seniority`,
  roleType: sql`excluded.role_type`,
  skills: sql`excluded.skills`,
  salaryMinUsdMonth: sql`excluded.salary_min_usd_month`,
  salaryMaxUsdMonth: sql`excluded.salary_max_usd_month`,
  salaryRaw: sql`excluded.salary_raw`,
  descriptionText: sql`coalesce(excluded.description_text, ${jobs.descriptionText})`,
  excerpt: sql`coalesce(excluded.excerpt, ${jobs.excerpt})`,
  applyUrl: sql`excluded.apply_url`,
  atsKind: sql`excluded.ats_kind`,
  postedAt: sql`coalesce(excluded.posted_at, ${jobs.postedAt})`,
  fingerprint: sql`excluded.fingerprint`,
  contentHash: sql`excluded.content_hash`,
  lastSeenAt: sql`excluded.last_seen_at`,
  isActive: sql`true`,
  closedAt: sql`null`,
}

export function upsertStatement(rows: JobInsert[]) {
  return db().insert(jobs).values(rows).onConflictDoUpdate({ target: jobs.id, set: UPSERT_SET })
}

export async function upsertJobs(rows: JobInsert[]): Promise<number> {
  if (rows.length === 0) return 0
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    await upsertStatement(rows.slice(index, index + CHUNK_SIZE))
  }
  return rows.length
}

export async function deactivateStale(sourceId: string, sweepStartedAt: Date): Promise<string[]> {
  const rows = await db()
    .update(jobs)
    .set({ isActive: false, closedAt: new Date() })
    .where(and(eq(jobs.sourceId, sourceId), eq(jobs.isActive, true), sql`${jobs.lastSeenAt} < ${sweepStartedAt}`))
    .returning({ id: jobs.id })
  return rows.map((row) => row.id)
}

export async function collapseDuplicates(fingerprints: string[]): Promise<number> {
  if (fingerprints.length === 0) return 0
  const result = await db().execute(sql`
    with canon as (
      select distinct on (fingerprint)
             fingerprint, id as canonical_id, tier as canonical_tier
      from jobs
      where is_active and fingerprint = any(${sql.param(fingerprints)}::text[])
      order by fingerprint, tier asc, posted_at desc nulls last, id
    )
    update jobs j
    set canonical_job_id = c.canonical_id
    from canon c
    where j.fingerprint = c.fingerprint
      and j.is_active
      and j.id <> c.canonical_id
      and j.tier > c.canonical_tier
      and j.canonical_job_id is distinct from c.canonical_id
    returning j.id
  `)
  return ((result.rows ?? result) as unknown as unknown[]).length
}

export async function releaseOrphanedDuplicates(fingerprints: string[]): Promise<number> {
  if (fingerprints.length === 0) return 0
  const result = await db().execute(sql`
    update jobs j
    set canonical_job_id = null
    from jobs a
    where j.canonical_job_id = a.id
      and not a.is_active
      and j.fingerprint = any(${sql.param(fingerprints)}::text[])
    returning j.id
  `)
  return ((result.rows ?? result) as unknown as unknown[]).length
}

export async function collapsedJobIds(fingerprints: string[]): Promise<Set<string>> {
  if (fingerprints.length === 0) return new Set()
  const rows = await db()
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        sql`${jobs.fingerprint} = any(${sql.param(fingerprints)}::text[])`,
        sql`${jobs.canonicalJobId} is not null`,
      ),
    )
  return new Set(rows.map((row) => row.id))
}

export async function loadDescribedIds(sourceId: string): Promise<Set<string>> {
  const rows = await db()
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.sourceId, sourceId), sql`${jobs.descriptionText} is not null`))
  return new Set(rows.map((row) => row.id))
}
