const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/

const ATS_HOSTS = [
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'workable.com',
  'smartrecruiters.com',
  'recruitee.com',
  'bamboohr.com',
  'myworkdayjobs.com',
  'workday.com',
  'taleo.net',
  'icims.com',
  'jobvite.com',
  'breezy.hr',
  'personio.de',
  'teamtailor.com',
  'rippling.com',
  'paylocity.com',
  'applytojob.com',
  'jazz.co',
  'jobs.polymer.co',
  'remotive.com',
  'weworkremotely.com',
  'arbeitnow.com',
  'arbeitnow.fr',
  'arbeitnow.co.uk',
  'himalayas.app',
  'workingnomads.com',
  'jobicy.com',
  'remoteok.com',
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'google.com',
  'bit.ly',
]

const STRIPPED_SUBDOMAINS = new Set(['www', 'jobs', 'careers', 'career', 'apply', 'boards', 'job', 'hiring', 'work'])

export function isValidDomain(value: string): boolean {
  if (value.length > 253) return false
  if (!DOMAIN_PATTERN.test(value)) return false
  if (value === 'localhost') return false
  return !/^\d+\.\d+\.\d+\.\d+$/.test(value)
}

export function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
  if (!trimmed) return null

  const labels = trimmed.split('.')
  const withoutPrefix = labels.length > 2 && STRIPPED_SUBDOMAINS.has(labels[0]) ? labels.slice(1).join('.') : trimmed

  return isValidDomain(withoutPrefix) ? withoutPrefix : null
}

export function isAtsHost(host: string): boolean {
  return ATS_HOSTS.some((ats) => host === ats || host.endsWith(`.${ats}`))
}

export function inferCompanyDomain(applyUrl: string | null | undefined): string | null {
  if (!applyUrl) return null
  let host: string
  try {
    const url = new URL(applyUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    host = url.hostname.toLowerCase()
  } catch {
    return null
  }

  if (isAtsHost(host)) return null
  return normalizeDomain(host)
}

function domainMatchesCompany(domain: string, normalizedCompany: string): boolean {
  if (!normalizedCompany) return false
  const withoutTld = domain.slice(0, domain.lastIndexOf('.')).replace(/\./g, '')
  const withoutDots = domain.replace(/\./g, '')
  return withoutTld === normalizedCompany || withoutDots === normalizedCompany
}

export function companyDomainFromName(company: string): string | null {
  const candidate = company.trim().toLowerCase().replace(/\s+/g, '')
  if (!candidate.includes('.')) return null
  return normalizeDomain(candidate)
}

export function companyDomainFromText(
  company: string,
  text: string | null | undefined,
  normalizeCompany: (value: string) => string,
  maxUrls = 40,
): string | null {
  if (!text) return null
  const normalizedCompany = normalizeCompany(company)
  if (!normalizedCompany) return null

  const urls = text.match(/https?:\/\/[a-zA-Z0-9.-]+/g) ?? []
  for (const url of urls.slice(0, maxUrls)) {
    const host = url.replace(/^https?:\/\//, '').toLowerCase()
    if (isAtsHost(host) || isAtsHost(host.replace(/^www\./, ''))) continue
    const domain = normalizeDomain(host)
    if (domain && domainMatchesCompany(domain, normalizedCompany)) return domain
  }

  return null
}

const MONOGRAM_HUES = [303, 240, 155, 60, 20, 195]

export function companyInitials(company: string): string {
  const words = company
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

export function companyHue(company: string): number {
  let hash = 0
  for (const char of company) hash = (hash * 31 + char.charCodeAt(0)) % 997
  return MONOGRAM_HUES[hash % MONOGRAM_HUES.length]
}
