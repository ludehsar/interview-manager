import { z } from 'zod'
import type {
  EmploymentType,
  JobListItem,
  RemoteRegion,
  RoleType,
  Seniority,
  SourceTier,
  WorkplaceType,
} from './types'

export const DEFAULT_PAGE_SIZE = 25

export type JobSort = 'recent' | 'relevance'

export type JobFilters = {
  q?: string
  region?: RemoteRegion[]
  locations?: string[]
  workplaceType?: WorkplaceType[]
  employmentType?: EmploymentType[]
  seniority?: Seniority[]
  roleType?: RoleType[]
  skills?: string[]
  company?: string
  salaryMinUsdMonth?: number
  tier?: SourceTier[]
  postedWithinDays?: number
  sort: JobSort
}

const cursorSchema = z.object({
  s: z.enum(['recent', 'relevance']),
  t: z.string(),
  i: z.string(),
  r: z.number().optional(),
})

export type JobCursor = z.infer<typeof cursorSchema>

export type JobPage = {
  items: JobListItem[]
  nextCursor: string | null
}

export type FacetBucket = { value: string; count: number }

export type JobFacets = {
  region: FacetBucket[]
  locations: FacetBucket[]
  workplaceType: FacetBucket[]
  employmentType: FacetBucket[]
  seniority: FacetBucket[]
  skills: FacetBucket[]
}

export const EMPTY_FACETS: JobFacets = {
  region: [],
  locations: [],
  workplaceType: [],
  employmentType: [],
  seniority: [],
  skills: [],
}

export function encodeCursor(cursor: JobCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeCursor(raw: string | null | undefined, sort: JobSort): JobCursor | null {
  if (!raw) return null
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')))
    if (!parsed.success) return null
    if (parsed.data.s !== sort) return null
    if (parsed.data.s === 'relevance' && typeof parsed.data.r !== 'number') return null
    return parsed.data
  } catch {
    return null
  }
}
