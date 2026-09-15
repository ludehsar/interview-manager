export type NumberToken = { value: number; unit: string | null; raw: string }

const MAGNITUDE: Record<string, number> = { k: 1e3, m: 1e6, mn: 1e6, b: 1e9, bn: 1e9 }

const UNIT_ALIASES: Record<string, string> = {
  percent: '%',
  pct: '%',
  hr: 'h',
  hrs: 'h',
  hour: 'h',
  hours: 'h',
  min: 'min',
  mins: 'min',
  minute: 'min',
  minutes: 'min',
  sec: 's',
  secs: 's',
  second: 's',
  seconds: 's',
  day: 'd',
  days: 'd',
  week: 'w',
  weeks: 'w',
  month: 'mo',
  months: 'mo',
  year: 'y',
  years: 'y',
  yr: 'y',
  yrs: 'y',
  user: 'users',
  users: 'users',
  customer: 'customers',
  customers: 'customers',
  engineer: 'people',
  engineers: 'people',
  people: 'people',
  person: 'people',
  developer: 'people',
  developers: 'people',
  usd: '$',
  dollars: '$',
  'req/s': 'rps',
  requests: 'rps',
  rps: 'rps',
  qps: 'rps',
  x: 'x',
  '×': 'x',
}

const CURRENCY = new Set(['$', '€', '£', '৳'])

const TOKEN =
  /([$€£৳])?\s?(\d[\d,]*(?:\.\d+)?)\s*(%|percent|pct|[kKmMbB]n?\b|×|x\b|hrs?\b|hours?\b|mins?\b|minutes?\b|secs?\b|seconds?\b|days?\b|weeks?\b|months?\b|years?\b|yrs?\b|ms\b|s\b|[KMGT]B\b|qps\b|rps\b|req\/s|requests?\b|users?\b|customers?\b|engineers?\b|developers?\b|people\b|person\b|usd\b|dollars\b)?/gi

function isVersionContext(text: string, index: number, techTokens: Set<string>): boolean {
  const before = text.slice(0, index).trimEnd()
  const word = /([A-Za-z][A-Za-z0-9.+#]*)$/.exec(before)?.[1]
  if (!word) return false
  return techTokens.has(word.toLowerCase())
}

export function extractNumbers(text: string, techTokens: Set<string> = new Set()): NumberToken[] {
  const tokens: NumberToken[] = []

  for (const match of text.matchAll(TOKEN)) {
    const [, currency, numberText, suffix] = match
    if (!numberText) continue

    const raw = match[0].trim()
    const digits = numberText.replace(/,/g, '')
    let value = Number(digits)
    if (!Number.isFinite(value)) continue

    const suffixRaw = suffix?.toLowerCase().trim() ?? ''
    const magnitude = MAGNITUDE[suffixRaw]
    if (magnitude) value *= magnitude

    let unit: string | null = null
    if (currency) unit = currency
    else if (suffixRaw && !magnitude) unit = UNIT_ALIASES[suffixRaw] ?? suffixRaw
    else if (magnitude) unit = null

    const bareInteger = !currency && suffixRaw === '' && !digits.includes('.')
    if (bareInteger && value >= 1900 && value <= 2099) continue
    if (!currency && isVersionContext(text, match.index ?? 0, techTokens)) continue

    tokens.push({ value, unit, raw })
  }

  return tokens
}

function significant(value: number): number {
  if (value === 0) return 0
  const magnitude = Math.floor(Math.log10(Math.abs(value)))
  const factor = 10 ** (2 - magnitude)
  return Math.round(value * factor) / factor
}

export function numbersMatch(candidate: NumberToken, allowed: NumberToken): boolean {
  if (significant(candidate.value) !== significant(allowed.value)) return false
  if (candidate.unit === null || allowed.unit === null) return true
  if (candidate.unit === allowed.unit) return true
  if (CURRENCY.has(candidate.unit) && CURRENCY.has(allowed.unit)) return candidate.unit === allowed.unit
  return false
}

export function numbersSubsetOf(candidate: NumberToken[], allowed: NumberToken[]): NumberToken[] {
  return candidate.filter((token) => !allowed.some((permitted) => numbersMatch(token, permitted)))
}
