import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type AshbyPosting = {
  id?: string
  title?: string
  location?: string
  employmentType?: string
  jobUrl?: string
  applyUrl?: string
  descriptionHtml?: string
  descriptionPlain?: string
  publishedAt?: string
  isListed?: boolean
  isRemote?: boolean
  workplaceType?: string
  compensation?: {
    summaryComponents?: { minValue?: number; maxValue?: number; currencyCode?: string; interval?: string }[]
    compensationTierSummary?: string
  }
  secondaryLocations?: { location?: string }[]
}

type AshbyResponse = { jobs?: AshbyPosting[] }

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  FullTime: 'FULL_TIME',
  PartTime: 'PART_TIME',
  Contract: 'CONTRACT',
  Intern: 'INTERNSHIP',
  Temporary: 'CONTRACT',
}

function boardUrl(identifier: string): string {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(identifier)}?includeCompensation=true`
}

export const ashbyAdapter: Adapter = {
  kind: 'ashby',
  tier: 'A',
  hosts: ['api.ashbyhq.com'],
  minGapMs: 500,

  probeUrl(source: SourceDefinition) {
    return boardUrl(source.identifier)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const response = await ctx.http.getJson<AshbyResponse>(boardUrl(source.identifier))
    return response.jobs ?? []
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    return (payload as AshbyPosting[])
      .filter((posting) => posting?.id && posting.title && posting.isListed !== false)
      .map((posting) => {
        const component = posting.compensation?.summaryComponents?.[0]
        const locations = [posting.location, ...(posting.secondaryLocations ?? []).map((entry) => entry.location)]
          .filter((value): value is string => Boolean(value))
          .join(', ')
        return {
          externalId: posting.id as string,
          title: posting.title as string,
          company: source.companyOverride ?? source.label,
          companyDomain: source.companyDomain ?? null,
          locationRaw: posting.isRemote ? `Remote${locations ? ` - ${locations}` : ''}` : locations || null,
          employmentType: posting.employmentType ? EMPLOYMENT[posting.employmentType] : undefined,
          descriptionHtml: posting.descriptionHtml ?? null,
          descriptionText: posting.descriptionPlain ?? null,
          applyUrl: posting.jobUrl ?? posting.applyUrl ?? '',
          atsKind: 'ashby',
          postedAt: posting.publishedAt ? new Date(posting.publishedAt) : null,
          salary: component
            ? {
                min: component.minValue ?? null,
                max: component.maxValue ?? null,
                currency: component.currencyCode ?? null,
                period: component.interval ?? null,
                raw: posting.compensation?.compensationTierSummary ?? null,
              }
            : posting.compensation?.compensationTierSummary
              ? { raw: posting.compensation.compensationTierSummary }
              : null,
        }
      })
      .filter((job) => job.applyUrl.length > 0)
  },
}
