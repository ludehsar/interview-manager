import { z } from 'zod'
import { decodeLocationToken, encodeLocationToken } from '@/domain/jobs/location'
import type { JobFilters, JobSort } from '@/domain/jobs/search'

const REGIONS = ['WORLDWIDE', 'APAC', 'BANGLADESH', 'REGION_LOCKED', 'UNKNOWN'] as const
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'UNKNOWN'] as const
const SENIORITIES = ['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL', 'LEAD', 'UNKNOWN'] as const
const TIERS = ['A', 'B', 'C'] as const
const WORKPLACE_TYPES = ['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'] as const
const MAX_LOCATIONS = 12

export type SearchParams = Record<string, string | string[] | undefined>

function list(value: string | string[] | undefined): string[] {
  if (!value) return []
  const values = Array.isArray(value) ? value : value.split(',')
  return values.map((entry) => entry.trim()).filter(Boolean)
}

function filterTo<T extends readonly string[]>(values: string[], allowed: T): T[number][] {
  return values.filter((value): value is T[number] => (allowed as readonly string[]).includes(value))
}

const numberParam = z.coerce.number().int().positive()

export function parseJobFilters(params: SearchParams): JobFilters {
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 200) : undefined
  const sort: JobSort = params.sort === 'relevance' && q ? 'relevance' : 'recent'

  const region = filterTo(list(params.region), REGIONS)
  const employmentType = filterTo(list(params.type), EMPLOYMENT_TYPES)
  const seniority = filterTo(list(params.seniority), SENIORITIES)
  const tier = filterTo(list(params.tier), TIERS)
  const skills = list(params.skills).slice(0, 10)
  const workplaceType = filterTo(list(params.workplace), WORKPLACE_TYPES)
  const locations = [
    ...new Set(
      list(params.loc)
        .map((entry) => decodeLocationToken(entry))
        .filter((entry) => entry !== null)
        .map((entry) => encodeLocationToken(entry)),
    ),
  ].slice(0, MAX_LOCATIONS)
  const company = typeof params.company === 'string' ? params.company.trim().slice(0, 100) : undefined
  const salary = numberParam.safeParse(params.salary)
  const days = numberParam.safeParse(params.days)

  return {
    q: q || undefined,
    sort,
    region: region.length ? region : undefined,
    locations: locations.length ? locations : undefined,
    workplaceType: workplaceType.length ? workplaceType : undefined,
    employmentType: employmentType.length ? employmentType : undefined,
    seniority: seniority.length ? seniority : undefined,
    tier: tier.length ? tier : undefined,
    skills: skills.length ? skills : undefined,
    company: company || undefined,
    salaryMinUsdMonth: salary.success ? salary.data : undefined,
    postedWithinDays: days.success ? Math.min(days.data, 365) : undefined,
  }
}

export function filtersToParams(filters: JobFilters, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.sort === 'relevance') params.set('sort', 'relevance')
  if (filters.region?.length) params.set('region', filters.region.join(','))
  if (filters.locations?.length) params.set('loc', filters.locations.join(','))
  if (filters.workplaceType?.length) params.set('workplace', filters.workplaceType.join(','))
  if (filters.employmentType?.length) params.set('type', filters.employmentType.join(','))
  if (filters.seniority?.length) params.set('seniority', filters.seniority.join(','))
  if (filters.tier?.length) params.set('tier', filters.tier.join(','))
  if (filters.skills?.length) params.set('skills', filters.skills.join(','))
  if (filters.company) params.set('company', filters.company)
  if (filters.salaryMinUsdMonth) params.set('salary', String(filters.salaryMinUsdMonth))
  if (filters.postedWithinDays) params.set('days', String(filters.postedWithinDays))
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function toggleValue(current: string[] | undefined, value: string): string[] {
  const values = current ?? []
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

const MAX_TRAIL = 20

export function parseTrail(value: string | string[] | undefined): string[] {
  if (typeof value !== 'string' || !value) return []
  return value.split('~').filter(Boolean).slice(0, MAX_TRAIL)
}

export function serializeTrail(trail: string[]): string | undefined {
  const bounded = trail.slice(-MAX_TRAIL)
  return bounded.length ? bounded.join('~') : undefined
}
