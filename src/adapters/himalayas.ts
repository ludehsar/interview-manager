import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type HimalayasJob = {
  guid?: string
  title?: string
  companyName?: string
  companySlug?: string
  companyLogo?: string
  applicationLink?: string
  employmentType?: string
  description?: string
  excerpt?: string
  pubDate?: number | string
  minSalary?: number | string
  maxSalary?: number | string
  currency?: string
  salaryPeriod?: string
  locationRestrictions?: string[]
  timezoneRestrictions?: string[]
  seniority?: string[]
}

type HimalayasResponse = { jobs?: HimalayasJob[]; totalCount?: number }

const PAGE_SIZE = 50

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  'full time': 'FULL_TIME',
  'part time': 'PART_TIME',
  contract: 'CONTRACT',
  contractor: 'CONTRACT',
  freelance: 'FREELANCE',
  internship: 'INTERNSHIP',
}

function pageUrl(offset: number): string {
  return `https://himalayas.app/jobs/api?limit=${PAGE_SIZE}&offset=${offset}`
}

export const himalayasAdapter: Adapter = {
  kind: 'himalayas',
  tier: 'B',
  hosts: ['himalayas.app'],
  minGapMs: 1500,

  probeUrl() {
    return pageUrl(0)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const all: HimalayasJob[] = []
    let declaredTotal: number | null = null
    for (let page = 0; page < ctx.maxPages; page += 1) {
      const response = await ctx.http.getJson<HimalayasResponse>(pageUrl(page * PAGE_SIZE))
      const jobs = response.jobs ?? []
      all.push(...jobs)
      if (jobs.length < PAGE_SIZE) break
      if (declaredTotal === null && typeof response.totalCount === 'number' && response.totalCount > 0) {
        declaredTotal = response.totalCount
      }
      if (declaredTotal !== null && all.length >= declaredTotal) break
    }
    return all
  },

  parse(payload: unknown[]): ParsedJob[] {
    return (payload as HimalayasJob[])
      .filter((job) => job?.guid && job.title && job.companyName)
      .map((job) => {
        const locations = [...(job.locationRestrictions ?? []), ...(job.timezoneRestrictions ?? [])].filter(Boolean)
        const seconds = typeof job.pubDate === 'string' ? Number(job.pubDate) : job.pubDate
        return {
          externalId: String(job.guid),
          title: job.title as string,
          company: job.companyName as string,
          companyDomain: null,
          locationRaw: locations.length > 0 ? locations.join(', ') : 'Remote',
          employmentType: job.employmentType ? EMPLOYMENT[job.employmentType.toLowerCase()] : undefined,
          descriptionHtml: job.description ?? null,
          applyUrl: job.applicationLink || `https://himalayas.app/companies/${job.companySlug}/jobs`,
          atsKind: 'himalayas',
          postedAt: seconds && Number.isFinite(seconds) ? new Date(Number(seconds) * 1000) : null,
          salary:
            job.minSalary || job.maxSalary
              ? {
                  min: job.minSalary ? Number(job.minSalary) : null,
                  max: job.maxSalary ? Number(job.maxSalary) : null,
                  currency: job.currency ?? null,
                  period: job.salaryPeriod ?? null,
                }
              : null,
        }
      })
      .filter((job) => job.applyUrl.startsWith('http'))
  },
}
