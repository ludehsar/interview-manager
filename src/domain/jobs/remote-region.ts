import type { RemoteRegion } from './types'

export type RegionOrigin = 'rule' | 'llm' | 'default'

export type RegionVerdict = {
  region: RemoteRegion
  countries: string[]
  origin: RegionOrigin
}

const BANGLADESH = /\b(bangladesh|dhaka|chattogram|chittagong|sylhet|khulna|rajshahi|bogura)\b/

const WORLDWIDE =
  /\b(worldwide|anywhere|globally|global remote|any location|work from anywhere|fully distributed|remote global|international)\b/

const APAC_TERMS = /\b(apac|asia pacific|asia-pacific|southeast asia|south east asia|south asia|east asia|anz|oceania)\b/

const APAC_PLACES: [RegExp, string][] = [
  [/\b(india|bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai|gurugram|gurgaon|noida|ahmedabad|kolkata|jaipur|indore|kochi|coimbatore|chandigarh|vadodara|mysore)\b/, 'IN'],
  [/\b(pakistan|karachi|lahore|islamabad)\b/, 'PK'],
  [/\b(sri lanka|colombo)\b/, 'LK'],
  [/\b(nepal|kathmandu)\b/, 'NP'],
  [/\b(singapore)\b/, 'SG'],
  [/\b(malaysia|kuala lumpur)\b/, 'MY'],
  [/\b(indonesia|jakarta|bali)\b/, 'ID'],
  [/\b(thailand|bangkok)\b/, 'TH'],
  [/\b(vietnam|viet nam|hanoi|ho chi minh)\b/, 'VN'],
  [/\b(philippines|manila|cebu)\b/, 'PH'],
  [/\b(hong kong)\b/, 'HK'],
  [/\b(taiwan|taipei)\b/, 'TW'],
  [/\b(japan|tokyo|osaka)\b/, 'JP'],
  [/\b(south korea|korea|seoul)\b/, 'KR'],
  [/\b(china|shanghai|beijing|shenzhen)\b/, 'CN'],
  [/\b(australia|sydney|melbourne|brisbane|perth)\b/, 'AU'],
  [/\b(new zealand|auckland|wellington)\b/, 'NZ'],
]

const LOCKED_PLACES: [RegExp, string[]][] = [
  [/\b(us only|usa only|united states|u\.s\.a|u\.s\.|\busa\b|\bus\b|us based|us-based|america)\b/, ['US']],
  [/\b(canada|toronto|vancouver|montreal)\b/, ['CA']],
  [/\b(united kingdom|uk only|\buk\b|london|england|scotland|wales)\b/, ['GB']],
  [/\b(ireland|dublin)\b/, ['IE']],
  [/\b(germany|berlin|munich|hamburg)\b/, ['DE']],
  [/\b(france|paris)\b/, ['FR']],
  [/\b(spain|madrid|barcelona)\b/, ['ES']],
  [/\b(portugal|lisbon|porto)\b/, ['PT']],
  [/\b(italy|rome|milan)\b/, ['IT']],
  [/\b(netherlands|amsterdam)\b/, ['NL']],
  [/\b(belgium|brussels)\b/, ['BE']],
  [/\b(poland|warsaw|krakow)\b/, ['PL']],
  [/\b(sweden|stockholm)\b/, ['SE']],
  [/\b(norway|oslo)\b/, ['NO']],
  [/\b(denmark|copenhagen)\b/, ['DK']],
  [/\b(finland|helsinki)\b/, ['FI']],
  [/\b(switzerland|zurich|geneva)\b/, ['CH']],
  [/\b(austria|vienna)\b/, ['AT']],
  [/\b(romania|bucharest)\b/, ['RO']],
  [/\b(ukraine|kyiv|kiev)\b/, ['UA']],
  [/\b(brazil|sao paulo)\b/, ['BR']],
  [/\b(mexico|mexico city)\b/, ['MX']],
  [/\b(argentina|buenos aires)\b/, ['AR']],
  [/\b(south africa|cape town|johannesburg)\b/, ['ZA']],
  [/\b(nigeria|lagos)\b/, ['NG']],
  [/\b(kenya|nairobi)\b/, ['KE']],
  [/\b(egypt|cairo)\b/, ['EG']],
  [/\b(united arab emirates|\buae\b|dubai|abu dhabi)\b/, ['AE']],
  [/\b(israel|tel aviv)\b/, ['IL']],
  [/\b(turkey|istanbul)\b/, ['TR']],
]

const LOCKED_BLOCS: [RegExp, string[]][] = [
  [/\b(emea)\b/, ['GB', 'DE', 'FR', 'NL', 'AE', 'ZA']],
  [/\b(eu only|european union|\beu\b|europe|european)\b/, ['DE', 'FR', 'NL', 'ES', 'PL', 'PT']],
  [/\b(latam|latin america)\b/, ['BR', 'MX', 'AR', 'CO']],
  [/\b(north america|namer)\b/, ['US', 'CA']],
]

const US_STATES =
  /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia)\b/

const US_CITIES =
  /\b(san francisco|new york city|nyc|seattle|dallas|austin|boston|chicago|los angeles|denver|atlanta|houston|miami|philadelphia|phoenix|portland|minneapolis|detroit|nashville|charlotte|raleigh|pittsburgh|salt lake city|san mateo|palo alto|mountain view|sunnyvale|santa clara|foster city|redmond|bellevue|arlington|mclean|reston|plano|irvine|boulder|san jose|san diego|washington d\.?c\.?|u\.s\.?a?\.?)\b/

const US_STATE_ABBR = new Set([
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me',
  'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa',
  'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc',
])

function trailingUsState(normalized: string): boolean {
  return normalized
    .split('|')
    .map((part) => part.trim())
    .some((part) => {
      const match = part.match(/,\s*([a-z]{2})\.?$/)
      return Boolean(match && US_STATE_ABBR.has(match[1]))
    })
}

const APAC_CODES = new Set(['bd', 'in', 'pk', 'lk', 'np', 'sg', 'my', 'id', 'th', 'vn', 'ph', 'hk', 'tw', 'jp', 'kr', 'cn', 'au', 'nz'])

const KNOWN_CODES = new Set([
  ...APAC_CODES,
  'us', 'ca', 'gb', 'ie', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'be', 'pl', 'se', 'no', 'dk', 'fi', 'ch', 'at', 'ro',
  'ua', 'br', 'mx', 'ar', 'za', 'ng', 'ke', 'eg', 'ae', 'il', 'tr', 'cz', 'gr', 'hu', 'bg', 'hr', 'rs', 'cl', 'co',
])

function trailingCountryCode(normalized: string): string | null {
  const tokens = normalized.split(/[\s,]+/).filter(Boolean)
  const last = tokens[tokens.length - 1]
  if (!last || last.length !== 2) return null
  return KNOWN_CODES.has(last) ? last : null
}

export function normalizeLocation(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+\-/. ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function utcSpan(normalized: string): { min: number; max: number } | null {
  const offsets = [...normalized.matchAll(/utc\s*([+-]\s*\d{1,2})/g)].map((match) =>
    Number(match[1].replace(/\s+/g, '')),
  )
  if (offsets.length < 2) return null
  return { min: Math.min(...offsets), max: Math.max(...offsets) }
}

export function classifyByRules(normalized: string): RegionVerdict | null {
  if (!normalized) return null

  if (BANGLADESH.test(normalized)) return { region: 'BANGLADESH', countries: ['BD'], origin: 'rule' }
  if (WORLDWIDE.test(normalized)) return { region: 'WORLDWIDE', countries: [], origin: 'rule' }

  const span = utcSpan(normalized)
  if (span) {
    if (span.max - span.min >= 20) return { region: 'WORLDWIDE', countries: [], origin: 'rule' }
    if (span.max >= 5 && span.min <= 12) return { region: 'APAC', countries: [], origin: 'rule' }
    return { region: 'REGION_LOCKED', countries: [], origin: 'rule' }
  }

  if (APAC_TERMS.test(normalized)) return { region: 'APAC', countries: [], origin: 'rule' }

  const apacCountries = APAC_PLACES.filter(([pattern]) => pattern.test(normalized)).map(([, code]) => code)
  if (apacCountries.length > 0) return { region: 'APAC', countries: apacCountries, origin: 'rule' }

  for (const [pattern, countries] of LOCKED_BLOCS) {
    if (pattern.test(normalized)) return { region: 'REGION_LOCKED', countries, origin: 'rule' }
  }

  const locked = LOCKED_PLACES.filter(([pattern]) => pattern.test(normalized)).flatMap(([, codes]) => codes)
  if (locked.length > 0) return { region: 'REGION_LOCKED', countries: [...new Set(locked)], origin: 'rule' }

  if (US_STATES.test(normalized) || US_CITIES.test(normalized) || trailingUsState(normalized)) {
    return { region: 'REGION_LOCKED', countries: ['US'], origin: 'rule' }
  }

  const code = trailingCountryCode(normalized)
  if (code) {
    const upper = code.toUpperCase()
    if (code === 'bd') return { region: 'BANGLADESH', countries: ['BD'], origin: 'rule' }
    if (APAC_CODES.has(code)) return { region: 'APAC', countries: [upper], origin: 'rule' }
    return { region: 'REGION_LOCKED', countries: [upper], origin: 'rule' }
  }

  return null
}

export const UNKNOWN_VERDICT: RegionVerdict = { region: 'UNKNOWN', countries: [], origin: 'default' }
