import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { closeDatabase, db } from '@/db/client'
import { isSearchEnabled, searchConfig } from '@/search/client'
import {
  dropJobsIndex,
  ensureJobsIndex,
  indexDocuments,
  refreshJobsIndex,
  type JobDocument,
} from '@/search/jobs-index'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

const BATCH_SIZE = 500

type Options = { recreate: boolean; batchSize: number }

function parseArgs(argv: string[]): Options {
  const options: Options = { recreate: false, batchSize: BATCH_SIZE }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--recreate') options.recreate = true
    else if (argv[i] === '--batch') options.batchSize = Number(argv[++i]) || BATCH_SIZE
  }
  return options
}

type Row = {
  id: string
  source_id: string
  source_kind: string
  tier: string
  title: string
  company: string
  company_domain: string | null
  location_raw: string | null
  remote_region: string
  countries: string[] | null
  cities: string[] | null
  workplace_type: string
  discipline: string
  employment_type: string
  seniority: string
  role_type: string
  skills: string[] | null
  salary_min_usd_month: number | null
  salary_max_usd_month: number | null
  excerpt: string | null
  description_text: string | null
  apply_url: string
  posted_at: Date | string | null
  first_seen_at: Date | string
  sort_at: Date | string
  is_active: boolean
  canonical_job_id: string | null
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function toDocument(row: Row): JobDocument {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceKind: row.source_kind,
    tier: row.tier,
    title: row.title,
    company: row.company,
    companyDomain: row.company_domain,
    locationRaw: row.location_raw,
    remoteRegion: row.remote_region,
    countries: row.countries ?? [],
    cities: row.cities ?? [],
    workplaceType: row.workplace_type,
    discipline: row.discipline,
    employmentType: row.employment_type,
    seniority: row.seniority,
    roleType: row.role_type,
    skills: row.skills ?? [],
    salaryMinUsdMonth: row.salary_min_usd_month,
    salaryMaxUsdMonth: row.salary_max_usd_month,
    excerpt: row.excerpt,
    descriptionText: row.description_text,
    applyUrl: row.apply_url,
    postedAt: row.posted_at ? iso(row.posted_at) : null,
    firstSeenAt: iso(row.first_seen_at),
    sortAt: iso(row.sort_at),
    isActive: row.is_active,
    canonicalJobId: row.canonical_job_id,
  }
}

async function readBatch(afterId: string | null, limit: number): Promise<Row[]> {
  const result = await db().execute(sql`
    select id, source_id, source_kind, tier, title, company, company_domain, location_raw,
           remote_region, countries, cities, workplace_type, discipline, employment_type, seniority, role_type,
           skills, salary_min_usd_month, salary_max_usd_month, excerpt, description_text, apply_url,
           posted_at, first_seen_at, sort_at, is_active, canonical_job_id
    from jobs
    where is_active and canonical_job_id is null
      ${afterId ? sql`and id > ${afterId}` : sql``}
    order by id asc
    limit ${limit}
  `)
  return (result.rows ?? result) as unknown as Row[]
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!isSearchEnabled()) throw new Error('OPENSEARCH_URL is not set')

  if (options.recreate) {
    await dropJobsIndex()
    console.log('dropped existing index')
  }
  const created = await ensureJobsIndex()
  console.log(`index ${searchConfig()?.index} ${created ? 'created' : 'already present'}`)

  let afterId: string | null = null
  let total = 0
  for (;;) {
    const rows: Row[] = await readBatch(afterId, options.batchSize)
    if (rows.length === 0) break
    total += await indexDocuments(rows.map(toDocument))
    afterId = rows[rows.length - 1].id
    console.log(`indexed ${total}`)
    if (rows.length < options.batchSize) break
  }

  await refreshJobsIndex()
  console.log(`done, ${total} documents indexed`)
  await closeDatabase()
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error)
  await closeDatabase().catch(() => undefined)
  process.exit(1)
})
