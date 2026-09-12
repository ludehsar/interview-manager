import { jobId } from '@/domain/jobs/fingerprint'
import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type WorkdayPosting = {
  title?: string
  externalPath?: string
  location?: string
  locationsText?: string
  postedOn?: string
  bulletFields?: string[]
  jobDescription?: string
  startDate?: string
  timeType?: string
  externalUrl?: string
}

type WorkdayListResponse = { jobPostings?: WorkdayPosting[]; total?: number }
type WorkdayDetailResponse = { jobPostingInfo?: WorkdayPosting }

const PAGE_SIZE = 20
const MAX_DETAIL_FETCHES = 40

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  'full time': 'FULL_TIME',
  'part time': 'PART_TIME',
  intern: 'INTERNSHIP',
  contract: 'CONTRACT',
}

export type WorkdayTarget = { tenant: string; host: string; site: string }

export function parseWorkdayIdentifier(identifier: string): WorkdayTarget | null {
  const [tenant, host, site] = identifier.split('|')
  if (!tenant || !host || !site) return null
  return { tenant, host, site }
}

function baseUrl(target: WorkdayTarget): string {
  return `https://${target.tenant}.${target.host}.myworkdayjobs.com/wday/cxs/${target.tenant}/${target.site}`
}

const LOCATION_SUMMARY = /^\s*\d+\s+locations?\s*$/i

export function workdayLocation(posting: WorkdayPosting): string | null {
  if (posting.location) return posting.location
  if (!posting.locationsText || LOCATION_SUMMARY.test(posting.locationsText)) return null
  return posting.locationsText
}

function requisitionId(posting: WorkdayPosting): string | null {
  const bullet = posting.bulletFields?.find((value) => value && value.trim().length > 0)
  if (bullet) return bullet.trim()
  const fromPath = posting.externalPath?.match(/_([A-Za-z0-9-]+)$/)
  return fromPath ? fromPath[1] : (posting.externalPath ?? null)
}

export const workdayAdapter: Adapter = {
  kind: 'workday',
  tier: 'A',
  hosts: ['myworkdayjobs.com'],
  minGapMs: 1200,

  probeUrl(source: SourceDefinition) {
    const target = parseWorkdayIdentifier(source.identifier)
    return target ? `${baseUrl(target)}/jobs` : ''
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const target = parseWorkdayIdentifier(source.identifier)
    if (!target) throw new Error(`invalid workday identifier: ${source.identifier}`)

    const base = baseUrl(target)
    const listed: WorkdayPosting[] = []
    let declaredTotal: number | null = null

    for (let page = 0; page < ctx.maxPages; page += 1) {
      const response = await ctx.http.postJson<WorkdayListResponse>(`${base}/jobs`, {
        appliedFacets: {},
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        searchText: '',
      })
      const postings = response.jobPostings ?? []
      listed.push(...postings)
      if (postings.length < PAGE_SIZE) break
      if (declaredTotal === null && typeof response.total === 'number' && response.total > 0) {
        declaredTotal = response.total
      }
      if (declaredTotal !== null && listed.length >= declaredTotal) break
    }

    const known = ctx.knownExternalIds
    const needsDetail = listed
      .filter((posting) => posting.externalPath)
      .filter((posting) => {
        const external = requisitionId(posting)
        return external ? !known || !known.has(jobId('workday', source.identifier, external)) : false
      })
      .slice(0, MAX_DETAIL_FETCHES)

    const details = new Map<string, WorkdayPosting>()
    for (const posting of needsDetail) {
      try {
        const detail = await ctx.http.getJson<WorkdayDetailResponse>(`${base}${posting.externalPath}`)
        if (detail.jobPostingInfo) details.set(posting.externalPath as string, detail.jobPostingInfo)
      } catch {
        continue
      }
    }

    return listed.map((posting) => ({ ...posting, ...(details.get(posting.externalPath ?? '') ?? {}) }))
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    const target = parseWorkdayIdentifier(source.identifier)
    if (!target) return []

    return (payload as WorkdayPosting[])
      .filter((posting) => posting?.title && posting.externalPath)
      .map((posting) => {
        const external = requisitionId(posting)
        const timeType = posting.timeType?.toLowerCase() ?? ''
        return {
          externalId: external ?? (posting.externalPath as string),
          title: posting.title as string,
          company: source.companyOverride ?? source.label,
          companyDomain: source.companyDomain ?? null,
          locationRaw: workdayLocation(posting),
          employmentType: EMPLOYMENT[timeType],
          descriptionHtml: posting.jobDescription ?? null,
          applyUrl:
            posting.externalUrl ??
            `https://${target.tenant}.${target.host}.myworkdayjobs.com/${target.site}${posting.externalPath}`,
          atsKind: 'workday',
          postedAt: posting.startDate ? new Date(posting.startDate) : null,
          salary: null,
        }
      })
      .filter((job) => job.externalId.length > 0)
  },
}
