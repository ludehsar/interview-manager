const REGION_LABELS: Record<string, string> = {
  WORLDWIDE: 'Worldwide',
  APAC: 'APAC',
  BANGLADESH: 'Bangladesh',
  REGION_LOCKED: 'Region locked',
  UNKNOWN: 'Unspecified',
}

const SENIORITY_LABELS: Record<string, string> = {
  INTERN: 'Intern',
  JUNIOR: 'Junior',
  MID: 'Mid',
  SENIOR: 'Senior',
  STAFF: 'Staff',
  PRINCIPAL: 'Principal',
  LEAD: 'Lead',
  UNKNOWN: 'Unspecified',
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  CONTRACT: 'Contract',
  FREELANCE: 'Freelance',
  INTERNSHIP: 'Internship',
  UNKNOWN: 'Unspecified',
}

const WORKPLACE_LABELS: Record<string, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'Onsite',
  UNKNOWN: 'Unspecified',
}

const TIER_LABELS: Record<string, string> = {
  A: 'Direct from employer',
  B: 'Curated board',
  C: 'Aggregator',
}

export function formatRegion(value: string): string {
  return REGION_LABELS[value] ?? value
}

export function formatSeniority(value: string): string {
  return SENIORITY_LABELS[value] ?? value
}

export function formatEmployment(value: string): string {
  return EMPLOYMENT_LABELS[value] ?? value
}

export function formatWorkplace(value: string): string {
  return WORKPLACE_LABELS[value] ?? value
}

export function formatTier(value: string): string {
  return TIER_LABELS[value] ?? value
}

export function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  const format = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`
  if (min && max && min !== max) return `${format(min)} - ${format(max)} / month`
  return `${format((min ?? max) as number)} / month`
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

function ago(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}

export function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

export function formatPostedAt(
  postedAt: Date | string | number | null | undefined,
  now: Date | number = Date.now(),
): string {
  const date = toDate(postedAt)
  if (!date) return ''

  const elapsed = (now instanceof Date ? now.getTime() : now) - date.getTime()
  if (elapsed < MINUTE_MS) return 'just now'
  if (elapsed < HOUR_MS) return ago(Math.floor(elapsed / MINUTE_MS), 'minute')
  if (elapsed < DAY_MS) return ago(Math.floor(elapsed / HOUR_MS), 'hour')

  const days = Math.floor(elapsed / DAY_MS)
  if (days < 30) return ago(days, 'day')
  if (days < 365) return ago(Math.floor(days / 30), 'month')
  return ago(Math.floor(days / 365), 'year')
}

export function formatExactDate(value: Date | string | number | null | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
