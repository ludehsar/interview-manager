import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type RemotiveJob = {
  id?: number | string
  url?: string
  title?: string
  company_name?: string
  category?: string
  job_type?: string
  publication_date?: string
  candidate_required_location?: string
  salary?: string
  description?: string
}

type RemotiveResponse = { jobs?: RemotiveJob[] }

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACT',
  freelance: 'FREELANCE',
  internship: 'INTERNSHIP',
}

function feedUrl(identifier: string): string {
  const base = 'https://remotive.com/api/remote-jobs?limit=200'
  return identifier && identifier !== 'all' ? `${base}&category=${encodeURIComponent(identifier)}` : base
}

export const remotiveAdapter: Adapter = {
  kind: 'remotive',
  tier: 'B',
  hosts: ['remotive.com'],
  minGapMs: 1500,

  probeUrl(source: SourceDefinition) {
    return feedUrl(source.identifier)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const response = await ctx.http.getJson<RemotiveResponse>(feedUrl(source.identifier))
    return response.jobs ?? []
  },

  parse(payload: unknown[]): ParsedJob[] {
    return (payload as RemotiveJob[])
      .filter((job) => job?.id !== undefined && job.title && job.company_name && job.url)
      .map((job) => ({
        externalId: String(job.id),
        title: job.title as string,
        company: job.company_name as string,
        companyDomain: null,
        locationRaw: job.candidate_required_location ?? null,
        employmentType: job.job_type ? EMPLOYMENT[job.job_type.toLowerCase()] : undefined,
        descriptionHtml: job.description ?? null,
        applyUrl: job.url as string,
        atsKind: 'remotive',
        postedAt: job.publication_date ? new Date(job.publication_date) : null,
        salary: job.salary ? { raw: job.salary } : null,
      }))
  },
}
