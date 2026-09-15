export type MetricStatus = 'QUANTIFIED' | 'ESTIMATED' | 'MISSING'

export const MIN_DECOMPOSE_CHARS = 20

const HEDGE =
  /(?:~|≈|\b(?:about|approx\.?|approximately|roughly|around|nearly|almost|over|under|up\s+to|more\s+than|less\s+than)\b)/i

const FIGURE =
  /(?:[$€£৳]\s?\d|(?<![A-Za-z])\d[\d,]*(?:\.\d+)?\s*(?:%|percent|[kKmMbB]n?\b|x\b|×|hrs?\b|hours?\b|mins?\b|minutes?\b|days?\b|weeks?\b|months?\b|years?\b|ms\b|s\b|[KMGT]B\b|qps\b|rps\b|req\/s))/

const COUNT = /(?<![A-Za-z$€£৳\d])(?!(?:19|20)\d{2}(?![\d,.]))\d[\d,]*(?:\.\d+)?\s+[A-Za-z]/

function hasFigure(value: string | null | undefined): boolean {
  if (!value) return false
  return FIGURE.test(value) || COUNT.test(value)
}

function isHedged(value: string | null | undefined): boolean {
  if (!value) return false
  return HEDGE.test(value)
}

export function deriveMetricStatus(input: {
  text?: string | null
  x?: string | null
  y?: string | null
  z?: string | null
}): MetricStatus {
  const outcome = [input.y, input.z].filter((value) => Boolean(value && value.trim()))
  if (outcome.length === 0) return 'MISSING'

  const carriers = [...outcome, input.text]
  if (!carriers.some(hasFigure)) return 'MISSING'
  if (carriers.some((value) => hasFigure(value) && isHedged(value))) return 'ESTIMATED'
  return 'QUANTIFIED'
}

export function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed === '') return null

  const iso = /^(\d{4})(?:-(\d{1,2}))?(?:-\d{1,2})?$/.exec(trimmed)
  if (iso) return iso[2] ? `${iso[1]}-${iso[2].padStart(2, '0')}` : iso[1]

  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]
  const named = /^([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(trimmed)
  if (named) {
    const index = monthNames.findIndex((month) => month.startsWith(named[1].toLowerCase()))
    if (index >= 0) return `${named[2]}-${String(index + 1).padStart(2, '0')}`
  }

  const slashed = /^(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (slashed) return `${slashed[2]}-${slashed[1].padStart(2, '0')}`

  return trimmed.slice(0, 10)
}

export function normalizeDateRange(input: { startDate?: string | null; endDate?: string | null; isCurrent?: boolean }): {
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
} {
  const startDate = normalizeDate(input.startDate)
  const isCurrent = Boolean(input.isCurrent)
  const endDate = isCurrent ? null : normalizeDate(input.endDate)

  if (startDate && endDate && endDate < startDate) {
    return { startDate: endDate, endDate: startDate, isCurrent }
  }
  return { startDate, endDate, isCurrent }
}
