import { CURRENCY_SYMBOLS, toUsd } from './fx'
import type { RawSalary } from './types'

export type SalaryUsdMonth = {
  minUsdMonth: number | null
  maxUsdMonth: number | null
  raw: string | null
}

export type Period = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR'

const MIN_USD_MONTH = 50
const MAX_USD_MONTH = 200000

const PERIOD_TO_MONTHLY: Record<Period, number> = {
  YEAR: 1 / 12,
  MONTH: 1,
  WEEK: 52 / 12,
  DAY: 260 / 12,
  HOUR: 2080 / 12,
}

const PERIOD_PATTERNS: [RegExp, Period][] = [
  [/\b(per\s+)?(year|yr|annum|annual(ly)?|pa|p\/a)\b/i, 'YEAR'],
  [/\b(per\s+)?(month|mo|monthly|p\/m)\b/i, 'MONTH'],
  [/\b(per\s+)?(week|wk|weekly)\b/i, 'WEEK'],
  [/\b(per\s+)?(day|daily|per diem)\b/i, 'DAY'],
  [/\b(per\s+)?(hour|hr|hourly|p\/h)\b/i, 'HOUR'],
]

export function detectPeriod(raw: string | null | undefined): Period | null {
  if (!raw) return null
  for (const [pattern, period] of PERIOD_PATTERNS) {
    if (pattern.test(raw)) return period
  }
  return null
}

export function detectCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  const iso = lower.match(/\b(usd|eur|gbp|cad|aud|nzd|sgd|chf|sek|nok|dkk|pln|czk|inr|bdt|pkr|lkr|npr|jpy|cny|hkd|twd|krw|myr|idr|thb|vnd|php|aed|sar|zar|brl|mxn|try|ils|ron|huf|uah|ngn|kes|egp)\b/)
  if (iso) return iso[1].toUpperCase()
  for (const [symbol, code] of CURRENCY_SYMBOLS) {
    if (lower.includes(symbol)) return code
  }
  return null
}

function parseAmount(token: string): number | null {
  const cleaned = token.replace(/[,\s]/g, '').toLowerCase()
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|m)?$/)
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value)) return null
  if (match[2] === 'k') return value * 1000
  if (match[2] === 'm') return value * 1000000
  return value
}

export function extractAmounts(raw: string | null | undefined): number[] {
  if (!raw) return []
  const matches = raw.match(/\d[\d,\s]*(?:\.\d+)?\s*[km]?/gi) ?? []
  return matches
    .map((token) => parseAmount(token))
    .filter((value): value is number => value !== null && value > 0)
}

function inferPeriod(amount: number): Period {
  if (amount > 15000) return 'YEAR'
  if (amount >= 20 && amount <= 500) return 'HOUR'
  return 'MONTH'
}

function clamp(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < MIN_USD_MONTH || rounded > MAX_USD_MONTH) return null
  return rounded
}

export function toMonthlyUsd(input: RawSalary | null | undefined): SalaryUsdMonth {
  const raw = input?.raw?.trim() || null
  if (!input) return { minUsdMonth: null, maxUsdMonth: null, raw: null }

  const currency = (input.currency || detectCurrency(raw) || 'USD').toUpperCase()
  const structured = [input.min, input.max].filter((value): value is number => typeof value === 'number' && value > 0)
  const amounts = structured.length > 0 ? structured : extractAmounts(raw)
  if (amounts.length === 0) return { minUsdMonth: null, maxUsdMonth: null, raw }

  const period = normalizePeriod(input.period) ?? detectPeriod(raw) ?? inferPeriod(Math.max(...amounts))
  const factor = PERIOD_TO_MONTHLY[period]

  const converted = amounts
    .map((amount) => toUsd(amount * factor, currency))
    .filter((value): value is number => value !== null)
    .map(clamp)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)

  if (converted.length === 0) return { minUsdMonth: null, maxUsdMonth: null, raw }

  return {
    minUsdMonth: converted[0],
    maxUsdMonth: converted[converted.length - 1],
    raw,
  }
}

function normalizePeriod(period: string | null | undefined): Period | null {
  if (!period) return null
  const value = period.toUpperCase()
  if (value.startsWith('YEAR') || value === 'ANNUAL' || value === 'ANNUALLY') return 'YEAR'
  if (value.startsWith('MONTH')) return 'MONTH'
  if (value.startsWith('WEEK')) return 'WEEK'
  if (value.startsWith('DAY') || value === 'DAILY') return 'DAY'
  if (value.startsWith('HOUR')) return 'HOUR'
  return null
}
