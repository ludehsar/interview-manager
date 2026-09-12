import { cityByAlias, cityLabel, countryByAlias, countryLabel, MAX_ALIAS_WORDS } from './geo'
import type { RemoteRegion, WorkplaceType } from './types'

export type ParsedLocation = {
  cities: string[]
  countries: string[]
  workplaceType: WorkplaceType
}

export type LocationToken = { kind: 'city' | 'country'; value: string }

export const EMPTY_LOCATION: ParsedLocation = { cities: [], countries: [], workplaceType: 'UNKNOWN' }

const SUBDIVISION_COUNTRY: Record<string, string> = {
  alabama: 'US', alaska: 'US', arizona: 'US', arkansas: 'US', california: 'US', colorado: 'US',
  connecticut: 'US', delaware: 'US', florida: 'US', georgia: 'US', hawaii: 'US', idaho: 'US',
  illinois: 'US', indiana: 'US', iowa: 'US', kansas: 'US', kentucky: 'US', louisiana: 'US',
  maine: 'US', maryland: 'US', massachusetts: 'US', michigan: 'US', minnesota: 'US',
  mississippi: 'US', missouri: 'US', montana: 'US', nebraska: 'US', nevada: 'US',
  'new hampshire': 'US', 'new jersey': 'US', 'new mexico': 'US', 'north carolina': 'US',
  'north dakota': 'US', ohio: 'US', oklahoma: 'US', oregon: 'US', pennsylvania: 'US',
  'rhode island': 'US', 'south carolina': 'US', 'south dakota': 'US', tennessee: 'US',
  texas: 'US', utah: 'US', vermont: 'US', virginia: 'US', washington: 'US',
  'west virginia': 'US', wisconsin: 'US', wyoming: 'US', 'district of columbia': 'US',
  ontario: 'CA', quebec: 'CA', 'british columbia': 'CA', alberta: 'CA', manitoba: 'CA',
  'nova scotia': 'CA', saskatchewan: 'CA',
  'new south wales': 'AU', queensland: 'AU', 'western australia': 'AU',
  'bavaria': 'DE', 'catalonia': 'ES',
}

const US_STATE_ABBR = new Set([
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'ia', 'ks', 'ky',
  'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc',
  'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi',
  'wy', 'dc',
])

const CA_PROVINCE_ABBR = new Set(['on', 'qc', 'bc', 'ab', 'mb', 'ns', 'sk', 'nb', 'nl', 'pe'])

const REMOTE_PATTERN =
  /\b(remote|work from home|work from anywhere|wfh|telecommut\w*|distributed|anywhere|home|virtual)\b/

const HYBRID_PATTERN = /\b(hybrid|partially remote|part remote|flexible work|home or office|office or home)\b/

const ONSITE_PATTERN = /\b(on[- ]?site|onsite|in[- ]office|in person|in-person|office based|office)\b/

const WORKPLACE_HINTS: [RegExp, WorkplaceType][] = [
  [HYBRID_PATTERN, 'HYBRID'],
  [REMOTE_PATTERN, 'REMOTE'],
  [ONSITE_PATTERN, 'ONSITE'],
]

export function normalizeLocationText(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchAliases(normalized: string): { cities: Set<string>; countries: Set<string> } {
  const cities = new Set<string>()
  const countries = new Set<string>()
  const words = normalized.split(' ').filter(Boolean)

  for (let start = 0; start < words.length; start += 1) {
    for (let size = Math.min(MAX_ALIAS_WORDS, words.length - start); size >= 1; size -= 1) {
      const phrase = words.slice(start, start + size).join(' ')

      const city = cityByAlias(phrase)
      if (city) {
        cities.add(city.slug)
        countries.add(city.country)
        break
      }

      const country = countryByAlias(phrase)
      if (country) {
        countries.add(country.code)
        break
      }

      const subdivision = SUBDIVISION_COUNTRY[phrase]
      if (subdivision) {
        countries.add(subdivision)
        break
      }

      if (size === 1 && start > 0 && phrase.length === 2) {
        if (US_STATE_ABBR.has(phrase)) countries.add('US')
        else if (CA_PROVINCE_ABBR.has(phrase)) countries.add('CA')
      }
    }
  }

  return { cities, countries }
}

export function inferWorkplaceType(
  locationRaw: string | null | undefined,
  hint?: string | null,
  hasCity = false,
): WorkplaceType {
  const fromHint = hint ? classifyWorkplaceHint(hint) : 'UNKNOWN'
  if (fromHint !== 'UNKNOWN') return fromHint

  const normalized = normalizeLocationText(locationRaw)
  if (normalized) {
    for (const [pattern, workplace] of WORKPLACE_HINTS) {
      if (pattern.test(normalized)) return workplace
    }
  }

  return hasCity ? 'ONSITE' : 'UNKNOWN'
}

export function classifyWorkplaceHint(hint: string): WorkplaceType {
  const normalized = normalizeLocationText(hint)
  if (!normalized) return 'UNKNOWN'
  for (const [pattern, workplace] of WORKPLACE_HINTS) {
    if (pattern.test(normalized)) return workplace
  }
  return 'UNKNOWN'
}

const APAC_CODES = new Set([
  'BD', 'IN', 'PK', 'LK', 'NP', 'BT', 'MV', 'SG', 'MY', 'ID', 'TH', 'VN', 'PH', 'HK', 'TW', 'JP',
  'KR', 'CN', 'AU', 'NZ', 'MM', 'KH', 'MN', 'FJ',
])

export function regionFromCountries(countries: string[]): RemoteRegion {
  if (countries.length === 0) return 'UNKNOWN'
  if (countries.every((code) => code === 'BD')) return 'BANGLADESH'
  if (countries.every((code) => APAC_CODES.has(code))) return 'APAC'
  return 'REGION_LOCKED'
}

export function parseLocation(
  locationRaw: string | null | undefined,
  options: { workplaceHint?: string | null; seedCountries?: string[]; fallbackCountry?: string | null } = {},
): ParsedLocation {
  const normalized = normalizeLocationText(locationRaw)
  const { cities, countries } = matchAliases(normalized)

  for (const code of options.seedCountries ?? []) {
    const upper = code.toUpperCase()
    if (upper.length === 2) countries.add(upper)
  }

  if (countries.size === 0 && options.fallbackCountry) {
    countries.add(options.fallbackCountry.toUpperCase())
  }

  return {
    cities: [...cities].sort(),
    countries: [...countries].sort(),
    workplaceType: inferWorkplaceType(locationRaw, options.workplaceHint, cities.size > 0),
  }
}

export function encodeLocationToken(token: LocationToken): string {
  return `${token.kind}:${token.value}`
}

export function decodeLocationToken(raw: string): LocationToken | null {
  const separator = raw.indexOf(':')
  if (separator <= 0) return null
  const kind = raw.slice(0, separator)
  const value = raw.slice(separator + 1).trim()
  if (!value) return null
  if (kind === 'city') return { kind: 'city', value: value.toLowerCase() }
  if (kind === 'country') return { kind: 'country', value: value.toUpperCase() }
  return null
}

export function splitLocationTokens(tokens: string[] | undefined): { cities: string[]; countries: string[] } {
  const cities: string[] = []
  const countries: string[] = []
  for (const raw of tokens ?? []) {
    const token = decodeLocationToken(raw)
    if (!token) continue
    if (token.kind === 'city') cities.push(token.value)
    else countries.push(token.value)
  }
  return { cities: [...new Set(cities)], countries: [...new Set(countries)] }
}

export function locationTokenLabel(raw: string): string {
  const token = decodeLocationToken(raw)
  if (!token) return raw
  return token.kind === 'city' ? cityLabel(token.value) : countryLabel(token.value)
}
