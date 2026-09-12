import { sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import type { EmploymentType, JobListItem, RemoteRegion, RoleType, Seniority, SourceTier } from './types'

export const DEFAULT_PAGE_SIZE = 25

export type JobSort = 'recent' | 'relevance'

export type JobFilters = {
  q?: string
  region?: RemoteRegion[]
  employmentType?: EmploymentType[]
  seniority?: Seniority[]
  roleType?: RoleType[]
  skills?: string[]
  company?: string
  salaryMinUsdMonth?: number
  tier?: SourceTier[]
  postedWithinDays?: number
  sort: JobSort
}

const cursorSchema = z.object({
  s: z.enum(['recent', 'relevance']),
  t: z.string(),
  i: z.string(),
  r: z.number().optional(),
})

export type JobCursor = z.infer<typeof cursorSchema>

export type JobPage = {
  items: JobListItem[]
  nextCursor: string | null
}

export type FacetBucket = { value: string; count: number }

export type JobFacets = {
  region: FacetBucket[]
  employmentType: FacetBucket[]
  seniority: FacetBucket[]
  tier: FacetBucket[]
  skills: FacetBucket[]
}

export function encodeCursor(cursor: JobCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeCursor(raw: string | null | undefined, sort: JobSort): JobCursor | null {
  if (!raw) return null
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')))
    if (!parsed.success) return null
    if (parsed.data.s !== sort) return null
    if (parsed.data.s === 'relevance' && typeof parsed.data.r !== 'number') return null
    return parsed.data
  } catch {
    return null
  }
}

function rankExpression(q: string): SQL {
  return sql`ts_rank_cd(j.search_vector, websearch_to_tsquery('english', ${q}))`
}

export function buildConditions(filters: JobFilters, skip?: keyof JobFilters): SQL[] {
  const conds: SQL[] = [sql`j.is_active`, sql`j.canonical_job_id is null`]

  if (filters.q && skip !== 'q') {
    conds.push(sql`j.search_vector @@ websearch_to_tsquery('english', ${filters.q})`)
  }
  if (filters.region?.length && skip !== 'region') {
    conds.push(sql`j.remote_region = any(${sql.param(filters.region)}::remote_region[])`)
  }
  if (filters.employmentType?.length && skip !== 'employmentType') {
    conds.push(sql`j.employment_type = any(${sql.param(filters.employmentType)}::employment_type[])`)
  }
  if (filters.seniority?.length && skip !== 'seniority') {
    conds.push(sql`j.seniority = any(${sql.param(filters.seniority)}::seniority[])`)
  }
  if (filters.roleType?.length && skip !== 'roleType') {
    conds.push(sql`j.role_type = any(${sql.param(filters.roleType)}::role_type[])`)
  }
  if (filters.tier?.length && skip !== 'tier') {
    conds.push(sql`j.tier = any(${sql.param(filters.tier)}::source_tier[])`)
  }
  if (filters.skills?.length && skip !== 'skills') {
    conds.push(sql`j.skills @> ${sql.param(filters.skills)}::text[]`)
  }
  if (filters.company && skip !== 'company') {
    conds.push(sql`j.company ilike ${`%${filters.company}%`}`)
  }
  if (filters.salaryMinUsdMonth && skip !== 'salaryMinUsdMonth') {
    conds.push(sql`j.salary_min_usd_month >= ${filters.salaryMinUsdMonth}`)
  }
  if (filters.postedWithinDays && skip !== 'postedWithinDays') {
    conds.push(sql`j.sort_at >= now() - make_interval(days => ${filters.postedWithinDays})`)
  }

  return conds
}

function whereClause(conds: SQL[]): SQL {
  return sql.join(conds, sql` and `)
}

type JobQueryRow = {
  id: string
  title: string
  company: string
  company_domain: string | null
  location_raw: string | null
  remote_region: RemoteRegion
  employment_type: EmploymentType
  seniority: Seniority
  skills: string[]
  salary_min_usd_month: number | null
  salary_max_usd_month: number | null
  tier: SourceTier
  excerpt: string | null
  posted_at: string | Date | null
  sort_at: string | Date
  rank?: number
}

function toListItem(row: JobQueryRow): JobListItem {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    companyDomain: row.company_domain,
    locationRaw: row.location_raw,
    remoteRegion: row.remote_region,
    employmentType: row.employment_type,
    seniority: row.seniority,
    skills: row.skills ?? [],
    salaryMinUsdMonth: row.salary_min_usd_month,
    salaryMaxUsdMonth: row.salary_max_usd_month,
    tier: row.tier,
    excerpt: row.excerpt,
    postedAt: row.posted_at ? new Date(row.posted_at) : null,
    sortAt: new Date(row.sort_at),
  }
}

export async function searchJobs(
  filters: JobFilters,
  cursor: JobCursor | null,
  limit = DEFAULT_PAGE_SIZE,
): Promise<JobPage> {
  const conds = buildConditions(filters)
  const useRelevance = filters.sort === 'relevance' && Boolean(filters.q)

  if (useRelevance && cursor?.r !== undefined) {
    const rank = rankExpression(filters.q as string)
    conds.push(sql`(${rank}, j.sort_at, j.id) < (${cursor.r}::float8, ${cursor.t}::timestamptz, ${cursor.i})`)
  } else if (!useRelevance && cursor) {
    conds.push(sql`(j.sort_at, j.id) < (${cursor.t}::timestamptz, ${cursor.i})`)
  }

  const selection = useRelevance
    ? sql`, ${rankExpression(filters.q as string)} as rank`
    : sql``
  const ordering = useRelevance
    ? sql`order by rank desc, j.sort_at desc, j.id desc`
    : sql`order by j.sort_at desc, j.id desc`

  const query = sql`
    select j.id, j.title, j.company, j.company_domain, j.location_raw, j.remote_region,
           j.employment_type, j.seniority, j.skills, j.salary_min_usd_month, j.salary_max_usd_month,
           j.tier, j.excerpt, j.posted_at, j.sort_at${selection}
    from jobs j
    where ${whereClause(conds)}
    ${ordering}
    limit ${limit + 1}
  `

  const result = await db().execute(query)
  const rows = (result.rows ?? result) as unknown as JobQueryRow[]
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]

  return {
    items: page.map(toListItem),
    nextCursor:
      hasMore && last
        ? encodeCursor({
            s: filters.sort,
            t: new Date(last.sort_at).toISOString(),
            i: last.id,
            ...(useRelevance ? { r: Number(last.rank) } : {}),
          })
        : null,
  }
}

export async function countJobs(filters: JobFilters): Promise<number> {
  const result = await db().execute(sql`
    select count(*)::int as total from jobs j where ${whereClause(buildConditions(filters))}
  `)
  const rows = (result.rows ?? result) as unknown as { total: number }[]
  return rows[0]?.total ?? 0
}

export async function loadFacets(filters: JobFilters): Promise<JobFacets> {
  const branch = (facet: string, column: string, skip: keyof JobFilters) =>
    sql`select ${sql.raw(`'${facet}'`)} as facet, ${sql.raw(column)}::text as value, count(*)::int as count
        from jobs j where ${whereClause(buildConditions(filters, skip))} group by 2`

  const enumFacets = await db().execute(sql`
    ${branch('region', 'j.remote_region', 'region')}
    union all
    ${branch('employment_type', 'j.employment_type', 'employmentType')}
    union all
    ${branch('seniority', 'j.seniority', 'seniority')}
    union all
    ${branch('tier', 'j.tier', 'tier')}
  `)

  const skillFacets = await db().execute(sql`
    select unnest(j.skills) as value, count(*)::int as count
    from jobs j
    where ${whereClause(buildConditions(filters, 'skills'))}
    group by 1
    order by count desc, value asc
    limit 20
  `)

  const enumRows = (enumFacets.rows ?? enumFacets) as unknown as { facet: string; value: string; count: number }[]
  const skillRows = (skillFacets.rows ?? skillFacets) as unknown as { value: string; count: number }[]
  const pick = (facet: string) =>
    enumRows
      .filter((row) => row.facet === facet)
      .map((row) => ({ value: row.value, count: row.count }))
      .sort((a, b) => b.count - a.count)

  return {
    region: pick('region'),
    employmentType: pick('employment_type'),
    seniority: pick('seniority'),
    tier: pick('tier'),
    skills: skillRows.map((row) => ({ value: row.value, count: row.count })),
  }
}

export async function recentActiveJobIds(limit = 200): Promise<string[]> {
  const result = await db().execute(sql`
    select j.id from jobs j
    where j.is_active and j.canonical_job_id is null
    order by j.sort_at desc, j.id desc
    limit ${limit}
  `)
  const rows = (result.rows ?? result) as unknown as { id: string }[]
  return rows.map((row) => row.id)
}
