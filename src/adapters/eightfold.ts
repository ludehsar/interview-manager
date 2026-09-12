import { jobId } from '@/domain/jobs/fingerprint'
import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type EightfoldPosition = {
  id?: string | number
  name?: string
  posting_name?: string
  location?: string
  locations?: string[]
  department?: string
  business_unit?: string
  t_create?: number
  t_update?: number
  ats_job_id?: string
  display_job_id?: string
  job_description?: string
  canonicalPositionUrl?: string
  work_location_option?: string
  isPrivate?: boolean
}

type EightfoldResponse = { positions?: EightfoldPosition[]; count?: number }

const PAGE_SIZE = 50
const MAX_DETAIL_FETCHES = 40

export type EightfoldTarget = { host: string; domain: string }

export function parseEightfoldIdentifier(identifier: string): EightfoldTarget | null {
  const [host, domain] = identifier.split('|')
  if (!host || !domain) return null
  return { host, domain }
}

function listUrl(target: EightfoldTarget, start: number): string {
  return `https://${target.host}/api/apply/v2/jobs?domain=${encodeURIComponent(target.domain)}&start=${start}&num=${PAGE_SIZE}`
}

function detailUrl(target: EightfoldTarget, id: string): string {
  return `https://${target.host}/api/apply/v2/jobs/${encodeURIComponent(id)}?domain=${encodeURIComponent(target.domain)}`
}

export const eightfoldAdapter: Adapter = {
  kind: 'eightfold',
  tier: 'A',
  hosts: ['eightfold.ai', 'jobs.netflix.net'],
  minGapMs: 1200,

  probeUrl(source: SourceDefinition) {
    const target = parseEightfoldIdentifier(source.identifier)
    return target ? listUrl(target, 0) : ''
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const target = parseEightfoldIdentifier(source.identifier)
    if (!target) throw new Error(`invalid eightfold identifier: ${source.identifier}`)

    const listed: EightfoldPosition[] = []
    let declaredTotal: number | null = null
    for (let page = 0; page < ctx.maxPages; page += 1) {
      const response = await ctx.http.getJson<EightfoldResponse>(listUrl(target, page * PAGE_SIZE))
      const positions = response.positions ?? []
      listed.push(...positions)
      if (positions.length < PAGE_SIZE) break
      if (declaredTotal === null && typeof response.count === 'number' && response.count > 0) {
        declaredTotal = response.count
      }
      if (declaredTotal !== null && listed.length >= declaredTotal) break
    }

    const known = ctx.knownExternalIds
    const needsDetail = listed
      .filter((position) => position.id !== undefined && !position.job_description)
      .filter((position) => !known || !known.has(jobId('eightfold', source.identifier, String(position.id))))
      .slice(0, MAX_DETAIL_FETCHES)

    const details = new Map<string, EightfoldPosition>()
    for (const position of needsDetail) {
      try {
        const detail = await ctx.http.getJson<EightfoldPosition>(detailUrl(target, String(position.id)))
        details.set(String(position.id), detail)
      } catch {
        continue
      }
    }

    return listed.map((position) => ({ ...position, ...(details.get(String(position.id)) ?? {}) }))
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    const target = parseEightfoldIdentifier(source.identifier)
    if (!target) return []

    return (payload as EightfoldPosition[])
      .filter((position) => position?.id !== undefined && (position.name || position.posting_name))
      .filter((position) => position.isPrivate !== true)
      .map((position) => {
        const locations = position.locations?.filter(Boolean) ?? []
        const location = locations.length > 0 ? locations.join(' | ') : (position.location ?? null)
        const remote = position.work_location_option?.toLowerCase() === 'remote'
        return {
          externalId: String(position.id),
          title: (position.name ?? position.posting_name) as string,
          company: source.companyOverride ?? source.label,
          companyDomain: source.companyDomain ?? target.domain,
          locationRaw: remote ? `Remote${location ? ` - ${location}` : ''}` : location,
          descriptionHtml: position.job_description ?? null,
          applyUrl: position.canonicalPositionUrl ?? `https://${target.host}/careers/job/${position.id}`,
          atsKind: 'eightfold',
          postedAt: position.t_create ? new Date(position.t_create * 1000) : null,
          salary: null,
        }
      })
  },
}
