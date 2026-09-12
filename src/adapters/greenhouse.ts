import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type GreenhouseJob = {
  id: number | string
  title?: string
  absolute_url?: string
  content?: string
  updated_at?: string
  first_published?: string
  location?: { name?: string }
  offices?: { name?: string; location?: string }[]
  metadata?: { name?: string; value?: unknown }[]
  company_name?: string
}

type GreenhouseResponse = { jobs?: GreenhouseJob[] }

function boardUrl(identifier: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(identifier)}/jobs?content=true`
}

export const greenhouseAdapter: Adapter = {
  kind: 'greenhouse',
  tier: 'A',
  hosts: ['boards-api.greenhouse.io'],
  minGapMs: 400,

  probeUrl(source: SourceDefinition) {
    return boardUrl(source.identifier)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const response = await ctx.http.getJson<GreenhouseResponse>(boardUrl(source.identifier))
    return response.jobs ?? []
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    return (payload as GreenhouseJob[])
      .filter((job) => job?.id !== undefined && job.title && job.absolute_url)
      .map((job) => {
        const salaryMeta = job.metadata?.find((entry) => /salary|compensation|pay/i.test(entry.name ?? ''))
        return {
          externalId: String(job.id),
          title: job.title as string,
          company: job.company_name ?? source.companyOverride ?? source.label,
          companyDomain: source.companyDomain ?? null,
          locationRaw: job.location?.name ?? job.offices?.[0]?.name ?? null,
          descriptionHtml: job.content ?? null,
          applyUrl: job.absolute_url as string,
          atsKind: 'greenhouse',
          postedAt: job.first_published ? new Date(job.first_published) : job.updated_at ? new Date(job.updated_at) : null,
          salary: salaryMeta?.value ? { raw: String(salaryMeta.value) } : null,
        }
      })
  },
}
