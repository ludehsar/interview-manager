import { companyDomainFromName, companyDomainFromText, inferCompanyDomain, normalizeDomain } from './company'
import { contentHash, dedupeFingerprint, jobId, normalizeCompany } from './fingerprint'
import { toMonthlyUsd } from './salary-usd'
import { extractSkills } from './skills'
import { excerpt, htmlToText, truncateDescription } from './text'
import type { EmploymentType, NormalizedJob, ParsedJob, RegionInput, RoleType, Seniority, SourceTier } from './types'

const SENIORITY_PATTERNS: [RegExp, Seniority][] = [
  [/\b(intern|internship|trainee|apprentice)\b/i, 'INTERN'],
  [/\b(junior|jr\.?|entry[- ]level|graduate|associate)\b/i, 'JUNIOR'],
  [/\b(principal|distinguished)\b/i, 'PRINCIPAL'],
  [/\b(staff)\b/i, 'STAFF'],
  [/\b(lead|head of|director|vp|chief)\b/i, 'LEAD'],
  [/\b(senior|sr\.?|experienced)\b/i, 'SENIOR'],
  [/\b(mid[- ]level|intermediate)\b/i, 'MID'],
]

const MANAGER_PATTERN = /\b(manager|head of|director|vp|vice president|chief|lead of)\b/i

const IC_OVERRIDE = /\b(engineering manager|product manager|program manager|project manager)\b/i

const EMPLOYMENT_PATTERNS: [RegExp, EmploymentType][] = [
  [/\b(full[- ]time|fulltime|permanent)\b/i, 'FULL_TIME'],
  [/\b(part[- ]time|parttime)\b/i, 'PART_TIME'],
  [/\b(contract|contractor|b2b)\b/i, 'CONTRACT'],
  [/\b(freelance|freelancer)\b/i, 'FREELANCE'],
  [/\b(intern|internship)\b/i, 'INTERNSHIP'],
]

export function inferSeniority(title: string): Seniority {
  for (const [pattern, seniority] of SENIORITY_PATTERNS) {
    if (pattern.test(title)) return seniority
  }
  return 'UNKNOWN'
}

export function inferRoleType(title: string): RoleType {
  if (IC_OVERRIDE.test(title)) return 'MANAGER'
  if (MANAGER_PATTERN.test(title)) return 'MANAGER'
  return 'IC'
}

export function inferEmploymentType(value: string | null | undefined, fallback?: EmploymentType): EmploymentType {
  if (fallback && fallback !== 'UNKNOWN') return fallback
  if (!value) return 'UNKNOWN'
  for (const [pattern, employmentType] of EMPLOYMENT_PATTERNS) {
    if (pattern.test(value)) return employmentType
  }
  return 'UNKNOWN'
}

export function normalizeJob(
  parsed: ParsedJob,
  source: {
    id: string
    kind: string
    identifier: string
    tier: SourceTier
    companyOverride?: string
    companyDomain?: string
  },
  region: RegionInput,
): NormalizedJob {
  const company = source.companyOverride ?? parsed.company
  const description = truncateDescription(parsed.descriptionText ?? htmlToText(parsed.descriptionHtml))
  const salary = toMonthlyUsd(parsed.salary)
  const skills = extractSkills(parsed.title, description)

  return {
    id: jobId(source.kind, source.identifier, parsed.externalId),
    sourceId: source.id,
    sourceKind: source.kind,
    tier: source.tier,
    externalId: parsed.externalId,
    title: parsed.title.trim(),
    company: company.trim(),
    companyDomain:
      normalizeDomain(source.companyDomain) ??
      normalizeDomain(parsed.companyDomain) ??
      inferCompanyDomain(parsed.applyUrl) ??
      companyDomainFromName(company) ??
      companyDomainFromText(company, description, normalizeCompany),
    locationRaw: parsed.locationRaw ?? null,
    remoteRegion: region.region,
    countries: region.countries,
    employmentType: inferEmploymentType(`${parsed.title} ${description ?? ''}`, parsed.employmentType),
    seniority: inferSeniority(parsed.title),
    roleType: inferRoleType(parsed.title),
    skills,
    salaryMinUsdMonth: salary.minUsdMonth,
    salaryMaxUsdMonth: salary.maxUsdMonth,
    salaryRaw: salary.raw,
    descriptionText: description,
    excerpt: excerpt(description),
    applyUrl: parsed.applyUrl,
    atsKind: parsed.atsKind ?? source.kind,
    postedAt: parsed.postedAt ?? null,
    fingerprint: dedupeFingerprint(company, parsed.title),
    contentHash: contentHash([
      parsed.title,
      company,
      parsed.locationRaw,
      description,
      parsed.applyUrl,
      salary.minUsdMonth,
      salary.maxUsdMonth,
    ]),
  }
}
