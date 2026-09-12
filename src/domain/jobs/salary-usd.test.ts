import { describe, expect, it } from 'vitest'
import { toMonthlyUsd } from './salary-usd'

describe('toMonthlyUsd', () => {
  it('converts a yearly usd range to monthly', () => {
    const result = toMonthlyUsd({ raw: '$120,000 - $150,000 a year' })
    expect(result.minUsdMonth).toBe(10000)
    expect(result.maxUsdMonth).toBe(12500)
  })

  it('handles k suffixes and non-usd currencies', () => {
    const result = toMonthlyUsd({ raw: '60k EUR/yr' })
    expect(result.minUsdMonth).toBe(5450)
  })

  it('annualizes an hourly rate', () => {
    const result = toMonthlyUsd({ raw: '$65/hour' })
    expect(result.minUsdMonth).toBe(11267)
  })

  it('reads a monthly local-currency amount', () => {
    const result = toMonthlyUsd({ raw: '80,000 BDT per month' })
    expect(result.minUsdMonth).toBe(672)
  })

  it('prefers structured fields over the raw string', () => {
    const result = toMonthlyUsd({ min: 96000, max: 120000, currency: 'USD', period: 'yearly', raw: 'see website' })
    expect(result.minUsdMonth).toBe(8000)
    expect(result.maxUsdMonth).toBe(10000)
  })

  it('infers yearly for a large unlabelled number', () => {
    expect(toMonthlyUsd({ raw: '140000' }).minUsdMonth).toBe(11667)
  })

  it('returns nulls when there is no number', () => {
    const result = toMonthlyUsd({ raw: 'Competitive salary' })
    expect(result.minUsdMonth).toBeNull()
    expect(result.maxUsdMonth).toBeNull()
    expect(result.raw).toBe('Competitive salary')
  })

  it('clamps implausible results away', () => {
    expect(toMonthlyUsd({ min: 5000000000, currency: 'USD', period: 'monthly' }).minUsdMonth).toBeNull()
  })
})
