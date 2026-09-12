import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type WorkableLocation = {
  country?: string
  countryCode?: string
  city?: string
  region?: string
  hidden?: boolean
}

type WorkableJob = {
  id?: string | number
  shortcode?: string
  title?: string
  url?: string
  shortlink?: string
  application_url?: string
  description?: string
  requirements?: string
  benefits?: string
  published_on?: string
  created_at?: string
  employment_type?: string
  city?: string
  state?: string
  country?: string
  locations?: WorkableLocation[]
  telecommuting?: boolean
  department?: string
}

type WorkableResponse = { jobs?: WorkableJob[]; name?: string }

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACT',
  temporary: 'CONTRACT',
  internship: 'INTERNSHIP',
  intern: 'INTERNSHIP',
}

function accountUrl(identifier: string): string {
  return `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(identifier)}?details=true`
}

function locationOf(job: WorkableJob): string | null {
  const visible = (job.locations ?? []).filter((location) => !location.hidden)
  const parts = visible.length
    ? visible.map((location) => [location.city, location.region, location.country].filter(Boolean).join(', '))
    : [[job.city, job.state, job.country].filter(Boolean).join(', ')]
  const joined = parts.filter(Boolean).join(' | ')
  if (job.telecommuting) return `Remote${joined ? ` - ${joined}` : ''}`
  return joined || null
}

export const workableAdapter: Adapter = {
  kind: 'workable',
  tier: 'A',
  hosts: ['apply.workable.com'],
  minGapMs: 600,

  probeUrl(source: SourceDefinition) {
    return accountUrl(source.identifier)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const response = await ctx.http.getJson<WorkableResponse>(accountUrl(source.identifier))
    return response.jobs ?? []
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    return (payload as WorkableJob[])
      .filter((job) => (job?.shortcode || job?.id) && job.title && (job.url || job.shortlink || job.application_url))
      .map((job) => ({
        externalId: String(job.shortcode ?? job.id),
        title: job.title as string,
        company: source.companyOverride ?? source.label,
        companyDomain: source.companyDomain ?? null,
        locationRaw: locationOf(job),
        employmentType: job.employment_type ? EMPLOYMENT[job.employment_type.toLowerCase()] : undefined,
        descriptionHtml: [job.description, job.requirements, job.benefits].filter(Boolean).join('\n') || null,
        applyUrl: (job.url ?? job.shortlink ?? job.application_url) as string,
        atsKind: 'workable',
        postedAt: job.published_on ? new Date(job.published_on) : job.created_at ? new Date(job.created_at) : null,
        salary: null,
      }))
  },
}
