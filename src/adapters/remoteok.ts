import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type RemoteOkEntry = {
  id?: string | number
  slug?: string
  company?: string
  position?: string
  description?: string
  location?: string
  tags?: string[]
  date?: string
  epoch?: number
  url?: string
  apply_url?: string
  salary_min?: number
  salary_max?: number
  legal?: string
}

const FEED_URL = 'https://remoteok.com/api'

export const REMOTEOK_ATTRIBUTION = 'https://remoteok.com'

export const remoteOkAdapter: Adapter = {
  kind: 'remoteok',
  tier: 'C',
  hosts: ['remoteok.com'],
  minGapMs: 3000,

  probeUrl() {
    return FEED_URL
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const entries = await ctx.http.getJson<RemoteOkEntry[]>(FEED_URL)
    return entries.filter((entry) => !entry.legal)
  },

  parse(payload: unknown[]): ParsedJob[] {
    return (payload as RemoteOkEntry[])
      .filter((entry) => !entry.legal)
      .filter((entry) => entry?.id !== undefined && entry.position && entry.company && entry.url)
      .map((entry) => ({
        externalId: String(entry.id),
        title: entry.position as string,
        company: entry.company as string,
        companyDomain: null,
        locationRaw: entry.location?.trim() ? entry.location : 'Remote',
        descriptionHtml: entry.description ?? null,
        applyUrl: (entry.url ?? entry.apply_url) as string,
        atsKind: 'remoteok',
        postedAt: entry.date ? new Date(entry.date) : entry.epoch ? new Date(entry.epoch * 1000) : null,
        salary:
          entry.salary_min || entry.salary_max
            ? {
                min: entry.salary_min ?? null,
                max: entry.salary_max ?? null,
                currency: 'USD',
                period: 'yearly',
              }
            : null,
      }))
      .filter((job) => !Number.isNaN(job.postedAt?.getTime() ?? 0))
  },
}
