import { jobId } from '@/domain/jobs/fingerprint'
import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type BdjobsSalary = {
  SalaryRange?: string | null
  MinSalary?: number | null
  MaxSalary?: number | null
  SalaryType?: string | null
  IsNegotiable?: boolean
  HideSalary?: boolean
}

type BdjobsListing = {
  Jobid?: string | number
  jobTitle?: string
  companyName?: string
  publishDate?: string
  deadlineDB?: string
  location?: string
  WorkPlace?: string
  JobType?: string
  jobContext?: string
  jobDescription?: string
  eduRec?: string
  experience?: string
  Salary?: BdjobsSalary
  OnlineJob?: boolean
}

type ListResponse = {
  data?: BdjobsListing[]
  premiumData?: BdjobsListing[]
  common?: { total_records_found?: number; totalpages?: number }
}

type DetailResponse = {
  data?: {
    JobId?: string
    JobDescription?: string
    JobResponsibilities?: string
    EducationalRequirements?: string
    ExperienceRequirements?: string
    AdditionalRequirements?: string
    JobLocation?: string
    Salary?: string
    OtherBenefits?: string
    JobNature?: string
    WorkPlace?: string
  }[]
}

const GATEWAY = 'https://gateway.bdjobs.com'
const PAGE_SIZE = 50
const MAX_DETAIL_FETCHES = 40

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  fulltime: 'FULL_TIME',
  'full time': 'FULL_TIME',
  parttime: 'PART_TIME',
  'part time': 'PART_TIME',
  contractual: 'CONTRACT',
  contract: 'CONTRACT',
  freelance: 'FREELANCE',
  intern: 'INTERNSHIP',
  internship: 'INTERNSHIP',
}

export function queryFor(identifier: string): string {
  if (!identifier || identifier === 'all') return ''
  const [kind, value] = identifier.split(':')
  if (!value) return ''
  if (kind === 'category') return `&category=${encodeURIComponent(value)}`
  if (kind === 'location') return `&location=${encodeURIComponent(value)}`
  if (kind === 'industry') return `&industry=${encodeURIComponent(value)}`
  if (kind === 'keyword') return `&keyword=${encodeURIComponent(value)}`
  return ''
}

function listUrl(identifier: string, page: number): string {
  return `${GATEWAY}/recruitment-account-test/api/JobSearch/GetJobSearch?isPro=1&rpp=${PAGE_SIZE}&pg=${page}${queryFor(identifier)}`
}

function detailUrl(externalId: string): string {
  return `${GATEWAY}/ActtivejobsTest/api/JobSubsystem/jobDetails?jobId=${encodeURIComponent(externalId)}`
}

export function applyUrlFor(externalId: string): string {
  return `https://jobs.bdjobs.com/jobdetails/?id=${encodeURIComponent(externalId)}&ln=1`
}

function salaryOf(listing: BdjobsListing): ParsedJob['salary'] {
  const salary = listing.Salary
  if (!salary || salary.HideSalary) return null
  const min = typeof salary.MinSalary === 'number' && salary.MinSalary > 0 ? salary.MinSalary : null
  const max = typeof salary.MaxSalary === 'number' && salary.MaxSalary > 0 ? salary.MaxSalary : null
  if (!min && !max && !salary.SalaryRange) return null
  return {
    min,
    max,
    currency: 'BDT',
    period: 'MONTH',
    raw: salary.SalaryRange ?? null,
  }
}

function descriptionOf(listing: BdjobsListing): string | null {
  const parts = [
    listing.jobContext,
    listing.jobDescription,
    listing.eduRec ? `Educational requirements: ${listing.eduRec}` : null,
    listing.experience ? `Experience: ${listing.experience}` : null,
  ]
  const joined = parts.filter(Boolean).join('\n')
  return joined || null
}

function mergeDetail(listing: BdjobsListing, detail: DetailResponse['data']): BdjobsListing {
  const row = detail?.[0]
  if (!row) return listing
  const description = [
    row.JobDescription,
    row.JobResponsibilities,
    row.EducationalRequirements,
    row.ExperienceRequirements,
    row.AdditionalRequirements,
    row.OtherBenefits,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    ...listing,
    jobDescription: description || listing.jobDescription,
    location: row.JobLocation || listing.location,
    WorkPlace: row.WorkPlace || listing.WorkPlace,
    JobType: row.JobNature || listing.JobType,
  }
}

export const bdjobsAdapter: Adapter = {
  kind: 'bdjobs',
  tier: 'B',
  hosts: ['gateway.bdjobs.com'],
  minGapMs: 1200,

  probeUrl(source: SourceDefinition) {
    return listUrl(source.identifier, 1)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const listed: BdjobsListing[] = []
    let declaredPages: number | null = null

    for (let page = 1; page <= ctx.maxPages; page += 1) {
      const response = await ctx.http.getJson<ListResponse>(listUrl(source.identifier, page))
      const rows = [...(response.premiumData ?? []), ...(response.data ?? [])]
      listed.push(...rows)
      if (declaredPages === null && typeof response.common?.totalpages === 'number') {
        declaredPages = response.common.totalpages
      }
      if (rows.length < PAGE_SIZE) break
      if (declaredPages !== null && page >= declaredPages) break
    }

    const seen = new Set<string>()
    const unique = listed.filter((listing) => {
      const id = listing.Jobid === undefined ? '' : String(listing.Jobid)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })

    const known = ctx.knownExternalIds
    const needsDetail = unique
      .filter((listing) => !known || !known.has(jobId('bdjobs', source.identityKey ?? source.identifier, String(listing.Jobid))))
      .slice(0, MAX_DETAIL_FETCHES)

    const details = new Map<string, DetailResponse['data']>()
    for (const listing of needsDetail) {
      try {
        const detail = await ctx.http.getJson<DetailResponse>(detailUrl(String(listing.Jobid)))
        details.set(String(listing.Jobid), detail.data)
      } catch {
        continue
      }
    }

    return unique.map((listing) => mergeDetail(listing, details.get(String(listing.Jobid))))
  },

  parse(payload: unknown[]): ParsedJob[] {
    return (payload as BdjobsListing[])
      .filter((listing) => listing?.Jobid !== undefined && listing.jobTitle && listing.companyName)
      .map((listing) => {
        const externalId = String(listing.Jobid)
        return {
          externalId,
          title: (listing.jobTitle as string).trim(),
          company: (listing.companyName as string).trim(),
          companyDomain: null,
          countryHint: 'BD',
          locationRaw: listing.location?.trim() || 'Bangladesh',
          workplaceRaw: listing.WorkPlace ?? null,
          employmentType: listing.JobType ? EMPLOYMENT[listing.JobType.toLowerCase()] : undefined,
          descriptionHtml: descriptionOf(listing),
          applyUrl: applyUrlFor(externalId),
          atsKind: 'bdjobs',
          postedAt: listing.publishDate ? new Date(listing.publishDate) : null,
          salary: salaryOf(listing),
        }
      })
  },
}
