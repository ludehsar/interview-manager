import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type WorkingNomadsJob = {
  url?: string
  title?: string
  description?: string
  company_name?: string
  category_name?: string
  tags?: string
  location?: string
  pub_date?: string
}

const FEED_URL = 'https://www.workingnomads.com/api/exposed_jobs/'

function externalIdFrom(url: string): string | null {
  const match = url.match(/\/job\/go\/(\d+)/) ?? url.match(/\/(\d+)\/?$/)
  return match ? match[1] : null
}

export const workingNomadsAdapter: Adapter = {
  kind: 'workingnomads',
  tier: 'B',
  hosts: ['www.workingnomads.com'],
  minGapMs: 2000,

  probeUrl() {
    return FEED_URL
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    return await ctx.http.getJson<WorkingNomadsJob[]>(FEED_URL)
  },

  parse(payload: unknown[]): ParsedJob[] {
    return (payload as WorkingNomadsJob[])
      .filter((job) => job?.url && job.title && job.company_name)
      .map((job) => {
        const externalId = externalIdFrom(job.url as string)
        return {
          externalId: externalId ?? (job.url as string),
          title: job.title as string,
          company: job.company_name as string,
          companyDomain: null,
          locationRaw: job.location ?? 'Remote',
          descriptionHtml: job.description ?? null,
          applyUrl: job.url as string,
          atsKind: 'workingnomads',
          postedAt: job.pub_date ? new Date(job.pub_date) : null,
          salary: null,
        }
      })
      .filter((job) => !Number.isNaN(job.postedAt?.getTime() ?? 0))
  },
}
