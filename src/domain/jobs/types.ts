import type { jobs } from '@/db/schema'

export type SourceTier = 'A' | 'B' | 'C'

export type RemoteRegion = 'WORLDWIDE' | 'APAC' | 'BANGLADESH' | 'REGION_LOCKED' | 'UNKNOWN'

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP' | 'UNKNOWN'

export type Seniority = 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF' | 'PRINCIPAL' | 'LEAD' | 'UNKNOWN'

export type RoleType = 'IC' | 'MANAGER' | 'UNKNOWN'

export type RegionInput = {
  region: RemoteRegion
  countries: string[]
}

export type JobRow = typeof jobs.$inferSelect

export type JobInsert = typeof jobs.$inferInsert

export type RawSalary = {
  min?: number | null
  max?: number | null
  currency?: string | null
  period?: string | null
  raw?: string | null
}

export type ParsedJob = {
  externalId: string
  title: string
  company: string
  companyDomain?: string | null
  locationRaw?: string | null
  employmentType?: EmploymentType
  descriptionHtml?: string | null
  descriptionText?: string | null
  applyUrl: string
  atsKind?: string | null
  postedAt?: Date | null
  salary?: RawSalary | null
}

export type NormalizedJob = {
  id: string
  sourceId: string
  sourceKind: string
  tier: SourceTier
  externalId: string
  title: string
  company: string
  companyDomain: string | null
  locationRaw: string | null
  remoteRegion: RemoteRegion
  countries: string[]
  employmentType: EmploymentType
  seniority: Seniority
  roleType: RoleType
  skills: string[]
  salaryMinUsdMonth: number | null
  salaryMaxUsdMonth: number | null
  salaryRaw: string | null
  descriptionText: string | null
  excerpt: string | null
  applyUrl: string
  atsKind: string | null
  postedAt: Date | null
  fingerprint: string
  contentHash: string
}

export type JobListItem = Pick<
  JobRow,
  | 'id'
  | 'title'
  | 'company'
  | 'companyDomain'
  | 'locationRaw'
  | 'remoteRegion'
  | 'employmentType'
  | 'seniority'
  | 'skills'
  | 'salaryMinUsdMonth'
  | 'salaryMaxUsdMonth'
  | 'tier'
  | 'excerpt'
  | 'postedAt'
> & { sortAt: Date }
