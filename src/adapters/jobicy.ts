import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type JobicyJob = {
  id?: string | number
  url?: string
  jobSlug?: string
  jobTitle?: string
  companyName?: string
  companyLogo?: string
  jobIndustry?: string[]
  jobType?: string[]
  jobGeo?: string
  jobLevel?: string
  jobExcerpt?: string
  jobDescription?: string
  pubDate?: string
  salaryMin?: number | string
  salaryMax?: number | string
  salaryCurrency?: string
  salaryPeriod?: string
}

type JobicyResponse = { jobs?: JobicyJob[]; jobCount?: number }

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACT',
  freelance: 'FREELANCE',
  internship: 'INTERNSHIP',
  temporary: 'CONTRACT',
}

function feedUrl(identifier: string): string {
  const base = 'https://jobicy.com/api/v2/remote-jobs?count=50'
  return identifier && identifier !== 'all' ? `${base}&industry=${encodeURIComponent(identifier)}` : base
}

export const jobicyAdapter: Adapter = {
  kind: 'jobicy',
  tier: 'C',
  hosts: ['jobicy.com'],
  minGapMs: 2000,

  probeUrl(source: SourceDefinition) {
    return feedUrl(source.identifier)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const response = await ctx.http.getJson<JobicyResponse>(feedUrl(source.identifier))
    return response.jobs ?? []
  },

  parse(payload: unknown[]): ParsedJob[] {
    return (payload as JobicyJob[])
      .filter((job) => job?.id !== undefined && job.jobTitle && job.companyName && job.url)
      .map((job) => {
        const type = job.jobType?.[0]?.toLowerCase()
        return {
          externalId: String(job.id),
          title: job.jobTitle as string,
          company: job.companyName as string,
          companyDomain: null,
          locationRaw: job.jobGeo ?? 'Remote',
          employmentType: type ? EMPLOYMENT[type] : undefined,
          descriptionHtml: job.jobDescription ?? job.jobExcerpt ?? null,
          applyUrl: job.url as string,
          atsKind: 'jobicy',
          postedAt: job.pubDate ? new Date(job.pubDate) : null,
          salary:
            job.salaryMin || job.salaryMax
              ? {
                  min: job.salaryMin ? Number(job.salaryMin) : null,
                  max: job.salaryMax ? Number(job.salaryMax) : null,
                  currency: job.salaryCurrency ?? null,
                  period: job.salaryPeriod ?? null,
                }
              : null,
        }
      })
  },
}
