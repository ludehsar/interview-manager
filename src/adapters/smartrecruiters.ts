import { jobId } from '@/domain/jobs/fingerprint'
import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type SmartRecruitersPosting = {
  id?: string
  name?: string
  ref?: string
  releasedDate?: string
  company?: { name?: string }
  location?: { city?: string; region?: string; country?: string; remote?: boolean }
  typeOfEmployment?: { label?: string }
  customField?: { fieldLabel?: string; valueLabel?: string }[]
  jobAd?: {
    sections?: {
      jobDescription?: { text?: string }
      qualifications?: { text?: string }
      additionalInformation?: { text?: string }
    }
  }
}

type PostingsResponse = { content?: SmartRecruitersPosting[]; totalFound?: number }

const PAGE_SIZE = 100
const MAX_DETAIL_FETCHES = 50

const EMPLOYMENT: Record<string, ParsedJob['employmentType']> = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACT',
  intern: 'INTERNSHIP',
  internship: 'INTERNSHIP',
}

function listUrl(identifier: string, offset: number): string {
  return `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(identifier)}/postings?limit=${PAGE_SIZE}&offset=${offset}`
}

function detailUrl(identifier: string, postingId: string): string {
  return `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(identifier)}/postings/${encodeURIComponent(postingId)}`
}

function applyUrl(identifier: string, posting: SmartRecruitersPosting): string {
  return `https://jobs.smartrecruiters.com/${identifier}/${posting.id}`
}

export const smartRecruitersAdapter: Adapter = {
  kind: 'smartrecruiters',
  tier: 'A',
  hosts: ['api.smartrecruiters.com'],
  minGapMs: 600,

  probeUrl(source: SourceDefinition) {
    return listUrl(source.identifier, 0)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const listed: SmartRecruitersPosting[] = []
    let declaredTotal: number | null = null
    for (let page = 0; page < ctx.maxPages; page += 1) {
      const response = await ctx.http.getJson<PostingsResponse>(listUrl(source.identifier, page * PAGE_SIZE))
      const content = response.content ?? []
      listed.push(...content)
      if (content.length < PAGE_SIZE) break
      if (declaredTotal === null && typeof response.totalFound === 'number' && response.totalFound > 0) {
        declaredTotal = response.totalFound
      }
      if (declaredTotal !== null && listed.length >= declaredTotal) break
    }

    const known = ctx.knownExternalIds
    const needsDetail = listed
      .filter((posting) => posting.id)
      .filter((posting) => !known || !known.has(jobId('smartrecruiters', source.identifier, String(posting.id))))
      .slice(0, MAX_DETAIL_FETCHES)

    const detailed = new Map<string, SmartRecruitersPosting>()
    for (const posting of needsDetail) {
      try {
        const detail = await ctx.http.getJson<SmartRecruitersPosting>(detailUrl(source.identifier, posting.id as string))
        detailed.set(posting.id as string, detail)
      } catch {
        continue
      }
    }

    return listed.map((posting) => ({ ...posting, ...(detailed.get(posting.id ?? '') ?? {}) }))
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    return (payload as SmartRecruitersPosting[])
      .filter((posting) => posting?.id && posting.name)
      .map((posting) => {
        const sections = posting.jobAd?.sections
        const description = [
          sections?.jobDescription?.text,
          sections?.qualifications?.text,
          sections?.additionalInformation?.text,
        ]
          .filter(Boolean)
          .join('\n')
        const location = [posting.location?.city, posting.location?.region, posting.location?.country]
          .filter(Boolean)
          .join(', ')
        const salaryField = posting.customField?.find((field) => /salary|compensation/i.test(field.fieldLabel ?? ''))
        return {
          externalId: posting.id as string,
          title: posting.name as string,
          company: posting.company?.name ?? source.companyOverride ?? source.label,
          companyDomain: source.companyDomain ?? null,
          locationRaw: posting.location?.remote ? `Remote${location ? ` - ${location}` : ''}` : location || null,
          employmentType: posting.typeOfEmployment?.label
            ? EMPLOYMENT[posting.typeOfEmployment.label.toLowerCase()]
            : undefined,
          descriptionHtml: description || null,
          applyUrl: applyUrl(source.identifier, posting),
          atsKind: 'smartrecruiters',
          postedAt: posting.releasedDate ? new Date(posting.releasedDate) : null,
          salary: salaryField?.valueLabel ? { raw: salaryField.valueLabel } : null,
        }
      })
  },
}
