import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type ArbeitnowJob = {
  slug?: string
  company_name?: string
  title?: string
  description?: string
  remote?: boolean
  url?: string
  tags?: string[]
  job_types?: string[]
  location?: string
  created_at?: number
}

type ArbeitnowResponse = { data?: ArbeitnowJob[]; meta?: { current_page?: number; last_page?: number } }

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  full_time: 'FULL_TIME',
  fulltime: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACT',
  freelance: 'FREELANCE',
  internship: 'INTERNSHIP',
}

function pageUrl(page: number): string {
  return `https://www.arbeitnow.com/api/job-board-api?page=${page}`
}

export const arbeitnowAdapter: Adapter = {
  kind: 'arbeitnow',
  tier: 'C',
  hosts: ['www.arbeitnow.com'],
  minGapMs: 1500,

  probeUrl() {
    return pageUrl(1)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const all: ArbeitnowJob[] = []
    for (let page = 1; page <= ctx.maxPages; page += 1) {
      const response = await ctx.http.getJson<ArbeitnowResponse>(pageUrl(page))
      const data = response.data ?? []
      all.push(...data)
      const lastPage = response.meta?.last_page
      if (data.length === 0 || (lastPage !== undefined && page >= lastPage)) break
    }
    return all
  },

  parse(payload: unknown[]): ParsedJob[] {
    return (payload as ArbeitnowJob[])
      .filter((job) => job?.slug && job.title && job.company_name && job.url)
      .map((job) => {
        const jobType = job.job_types?.[0]?.toLowerCase()
        return {
          externalId: job.slug as string,
          title: job.title as string,
          company: job.company_name as string,
          companyDomain: null,
          locationRaw: job.remote ? `Remote${job.location ? ` - ${job.location}` : ''}` : (job.location ?? null),
          employmentType: jobType ? EMPLOYMENT[jobType] : undefined,
          descriptionHtml: job.description ?? null,
          applyUrl: job.url as string,
          atsKind: 'arbeitnow',
          postedAt: job.created_at ? new Date(job.created_at * 1000) : null,
          salary: null,
        }
      })
  },
}
