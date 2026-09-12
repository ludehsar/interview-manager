import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type AmazonJob = {
  id?: string
  id_icims?: string
  title?: string
  company_name?: string
  job_path?: string
  posted_date?: string
  updated_time?: string
  city?: string
  state?: string
  country_code?: string
  normalized_location?: string
  locations?: string[]
  description?: string
  description_short?: string
  basic_qualifications?: string
  preferred_qualifications?: string
  job_schedule_type?: string
  is_intern?: string
}

type AmazonResponse = { jobs?: AmazonJob[]; hits?: number; error?: string | null }

const PAGE_SIZE = 100

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
}

function pageUrl(identifier: string, offset: number): string {
  const params = new URLSearchParams({
    result_limit: String(PAGE_SIZE),
    offset: String(offset),
    sort: 'recent',
  })
  if (identifier && identifier !== 'all') params.set('category', identifier)
  return `https://www.amazon.jobs/en/search.json?${params.toString()}`
}

function locationOf(job: AmazonJob): string | null {
  if (job.normalized_location) return job.normalized_location
  const parts = [job.city, job.state, job.country_code].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : (job.locations?.[0] ?? null)
}

export const amazonAdapter: Adapter = {
  kind: 'amazon',
  tier: 'A',
  hosts: ['www.amazon.jobs'],
  minGapMs: 1200,

  probeUrl(source: SourceDefinition) {
    return pageUrl(source.identifier, 0)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const all: AmazonJob[] = []
    let declaredTotal: number | null = null
    for (let page = 0; page < ctx.maxPages; page += 1) {
      const response = await ctx.http.getJson<AmazonResponse>(pageUrl(source.identifier, page * PAGE_SIZE))
      const jobs = response.jobs ?? []
      all.push(...jobs)
      if (jobs.length < PAGE_SIZE) break
      if (declaredTotal === null && typeof response.hits === 'number' && response.hits > 0) {
        declaredTotal = response.hits
      }
      if (declaredTotal !== null && all.length >= declaredTotal) break
    }
    return all
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    return (payload as AmazonJob[])
      .filter((job) => (job?.id_icims || job?.id) && job.title && job.job_path)
      .map((job) => {
        const description = [job.description, job.basic_qualifications, job.preferred_qualifications]
          .filter(Boolean)
          .join('\n')
        const schedule = job.job_schedule_type?.toLowerCase() ?? ''
        return {
          externalId: String(job.id_icims ?? job.id),
          title: job.title as string,
          company: job.company_name?.trim() || source.companyOverride || 'Amazon',
          companyDomain: source.companyDomain ?? 'amazon.com',
          locationRaw: locationOf(job),
          employmentType: job.is_intern === 'true' ? 'INTERNSHIP' : EMPLOYMENT[schedule],
          descriptionHtml: description || job.description_short || null,
          applyUrl: `https://www.amazon.jobs${job.job_path}`,
          atsKind: 'amazon',
          postedAt: job.posted_date ? new Date(job.posted_date) : null,
          salary: null,
        }
      })
      .filter((job) => !Number.isNaN(job.postedAt?.getTime() ?? 0))
  },
}
