import { describe, expect, it } from 'vitest'
import { formatPostedAt, formatSalary, toDate } from './format'

const NOW = new Date('2026-09-12T12:00:00.000Z').getTime()

function ago(ms: number): number {
  return NOW - ms
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatPostedAt', () => {
  it('reports seconds as just now', () => {
    expect(formatPostedAt(ago(0), NOW)).toBe('just now')
    expect(formatPostedAt(ago(59 * SECOND), NOW)).toBe('just now')
  })

  it('reports minutes with singular and plural', () => {
    expect(formatPostedAt(ago(MINUTE), NOW)).toBe('1 minute ago')
    expect(formatPostedAt(ago(5 * MINUTE), NOW)).toBe('5 minutes ago')
    expect(formatPostedAt(ago(59 * MINUTE), NOW)).toBe('59 minutes ago')
  })

  it('rolls over to hours', () => {
    expect(formatPostedAt(ago(HOUR), NOW)).toBe('1 hour ago')
    expect(formatPostedAt(ago(3 * HOUR), NOW)).toBe('3 hours ago')
    expect(formatPostedAt(ago(23 * HOUR + 59 * MINUTE), NOW)).toBe('23 hours ago')
  })

  it('rolls over to days instead of saying today or yesterday', () => {
    expect(formatPostedAt(ago(DAY), NOW)).toBe('1 day ago')
    expect(formatPostedAt(ago(6 * DAY), NOW)).toBe('6 days ago')
    expect(formatPostedAt(ago(29 * DAY), NOW)).toBe('29 days ago')
  })

  it('keeps coarser units for older postings', () => {
    expect(formatPostedAt(ago(30 * DAY), NOW)).toBe('1 month ago')
    expect(formatPostedAt(ago(200 * DAY), NOW)).toBe('6 months ago')
    expect(formatPostedAt(ago(400 * DAY), NOW)).toBe('1 year ago')
  })

  it('treats a future timestamp as just now rather than a negative count', () => {
    expect(formatPostedAt(NOW + 10 * MINUTE, NOW)).toBe('just now')
  })

  it('accepts dates and iso strings', () => {
    expect(formatPostedAt(new Date(ago(2 * HOUR)), NOW)).toBe('2 hours ago')
    expect(formatPostedAt(new Date(ago(2 * HOUR)).toISOString(), NOW)).toBe('2 hours ago')
  })

  it('returns an empty string for missing or unparseable input', () => {
    expect(formatPostedAt(null, NOW)).toBe('')
    expect(formatPostedAt(undefined, NOW)).toBe('')
    expect(formatPostedAt('not a date', NOW)).toBe('')
  })
})

describe('toDate', () => {
  it('normalizes the shapes the database and adapters produce', () => {
    expect(toDate(new Date(NOW))?.getTime()).toBe(NOW)
    expect(toDate(new Date(NOW).toISOString())?.getTime()).toBe(NOW)
    expect(toDate(NOW)?.getTime()).toBe(NOW)
    expect(toDate(null)).toBeNull()
    expect(toDate('nonsense')).toBeNull()
  })
})

describe('formatSalary', () => {
  it('formats a range and a single figure', () => {
    expect(formatSalary(10000, 12500)).toBe('$10,000 - $12,500 / month')
    expect(formatSalary(8000, 8000)).toBe('$8,000 / month')
    expect(formatSalary(null, null)).toBeNull()
  })
})
