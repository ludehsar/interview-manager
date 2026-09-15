import { describe, expect, it } from 'vitest'
import { deriveMetricStatus, normalizeDate, normalizeDateRange } from './xyz'

describe('deriveMetricStatus', () => {
  it('is MISSING when neither Y nor Z is filled in', () => {
    expect(deriveMetricStatus({ text: 'Led the billing rewrite', x: 'Led the billing rewrite' })).toBe('MISSING')
  })

  it('is MISSING when the outcome carries no figure', () => {
    expect(deriveMetricStatus({ y: 'faster checkout', z: 'happier customers' })).toBe('MISSING')
  })

  it('is QUANTIFIED when the outcome carries a hard figure', () => {
    expect(deriveMetricStatus({ y: 'cut p95 latency to 240 ms', z: 'for 1.2M monthly users' })).toBe('QUANTIFIED')
  })

  it('reads a currency amount as a figure', () => {
    expect(deriveMetricStatus({ y: 'saved $40k per year', z: 'in cloud spend' })).toBe('QUANTIFIED')
  })

  it('is ESTIMATED when the figure is hedged', () => {
    expect(deriveMetricStatus({ y: 'cut build time by ~40%', z: 'across the fleet' })).toBe('ESTIMATED')
    expect(deriveMetricStatus({ y: 'roughly 30% fewer incidents' })).toBe('ESTIMATED')
    expect(deriveMetricStatus({ z: 'approximately 12 hours saved weekly' })).toBe('ESTIMATED')
  })

  it('falls back to the bullet text for the figure when Z is qualitative', () => {
    expect(deriveMetricStatus({ text: 'Cut deploy time from 40 minutes to 6 minutes', z: 'for every service' })).toBe(
      'QUANTIFIED',
    )
  })

  it('treats a bare year as no figure', () => {
    expect(deriveMetricStatus({ y: 'shipped in 2021', z: 'to production' })).toBe('MISSING')
    expect(deriveMetricStatus({ y: 'ran from 2019 to 2021', z: 'across the org' })).toBe('MISSING')
  })

  it('counts a bare count of things as a figure', () => {
    expect(deriveMetricStatus({ y: 'covered 140 services', z: 'across 9 teams' })).toBe('QUANTIFIED')
    expect(deriveMetricStatus({ y: 'eliminated 31 production incidents' })).toBe('QUANTIFIED')
    expect(deriveMetricStatus({ y: 'served 12000 events per second' })).toBe('QUANTIFIED')
  })

  it('does not read a hedge inside a longer word', () => {
    expect(deriveMetricStatus({ y: 'covered 140 services', z: 'in one quarter' })).toBe('QUANTIFIED')
    expect(deriveMetricStatus({ y: 'discovered 12 defects', z: 'before release' })).toBe('QUANTIFIED')
    expect(deriveMetricStatus({ y: 'cut spend by over 40%' })).toBe('ESTIMATED')
  })

  it('still needs a number, not just a noun', () => {
    expect(deriveMetricStatus({ y: 'covered many services', z: 'across several teams' })).toBe('MISSING')
  })
})

describe('normalizeDate', () => {
  it('keeps a bare year', () => {
    expect(normalizeDate('2019')).toBe('2019')
  })

  it('zero-pads an iso month', () => {
    expect(normalizeDate('2019-3')).toBe('2019-03')
  })

  it('parses a named month', () => {
    expect(normalizeDate('Mar 2019')).toBe('2019-03')
    expect(normalizeDate('September 2021')).toBe('2021-09')
  })

  it('parses a slashed month', () => {
    expect(normalizeDate('7/2020')).toBe('2020-07')
  })

  it('returns null for blanks', () => {
    expect(normalizeDate('   ')).toBeNull()
    expect(normalizeDate(null)).toBeNull()
  })
})

describe('normalizeDateRange', () => {
  it('drops the end date when the entry is current', () => {
    expect(normalizeDateRange({ startDate: '2022-01', endDate: '2023-01', isCurrent: true })).toEqual({
      startDate: '2022-01',
      endDate: null,
      isCurrent: true,
    })
  })

  it('swaps an inverted range', () => {
    expect(normalizeDateRange({ startDate: '2023-01', endDate: '2021-06' })).toEqual({
      startDate: '2021-06',
      endDate: '2023-01',
      isCurrent: false,
    })
  })
})
