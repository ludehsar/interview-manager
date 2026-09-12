import { describe, expect, it } from 'vitest'
import { classifyByRules, normalizeLocation } from './remote-region'

function classify(raw: string) {
  return classifyByRules(normalizeLocation(raw))
}

describe('classifyByRules', () => {
  it('detects bangladesh before any other rule', () => {
    expect(classify('Dhaka, Bangladesh')?.region).toBe('BANGLADESH')
    expect(classify('Remote - Bangladesh')?.countries).toEqual(['BD'])
  })

  it('detects worldwide phrasing', () => {
    expect(classify('Remote, Worldwide')?.region).toBe('WORLDWIDE')
    expect(classify('Work from anywhere')?.region).toBe('WORLDWIDE')
  })

  it('reads utc offset ranges', () => {
    expect(classify('UTC+5 to UTC+11')?.region).toBe('APAC')
    expect(classify('UTC-12 to UTC+12')?.region).toBe('WORLDWIDE')
    expect(classify('UTC-8 to UTC-5')?.region).toBe('REGION_LOCKED')
  })

  it('maps apac countries and terms', () => {
    expect(classify('APAC')?.region).toBe('APAC')
    expect(classify('Singapore')?.countries).toEqual(['SG'])
    expect(classify('Remote (India)')?.region).toBe('APAC')
  })

  it('locks other regions', () => {
    expect(classify('US only')?.region).toBe('REGION_LOCKED')
    expect(classify('EMEA')?.region).toBe('REGION_LOCKED')
    expect(classify('Berlin, Germany')?.countries).toEqual(['DE'])
  })

  it('falls through on a bare remote signal', () => {
    expect(classify('Remote')).toBeNull()
    expect(classify('')).toBeNull()
  })
})

describe('trailing country codes', () => {
  it('reads a two-letter code at the end of a location', () => {
    expect(classify('Campinas, SP, br')?.countries).toEqual(['BR'])
    expect(classify('Campinas, SP, br')?.region).toBe('REGION_LOCKED')
  })

  it('routes apac codes to APAC and bd to BANGLADESH', () => {
    expect(classify('Remote, sg')?.region).toBe('APAC')
    expect(classify('Some City, bd')?.region).toBe('BANGLADESH')
  })

  it('ignores two-letter words that are not country codes', () => {
    expect(classify('Remote, xx')).toBeNull()
  })
})

describe('united states coverage', () => {
  it('classifies us cities and states', () => {
    expect(classify('San Francisco, CA')?.countries).toEqual(['US'])
    expect(classify('Seattle, Washington')?.region).toBe('REGION_LOCKED')
    expect(classify('New York, NY')?.countries).toEqual(['US'])
    expect(classify('Washington, D.C.')?.countries).toEqual(['US'])
    expect(classify('Remote - Foster City, CA')?.countries).toEqual(['US'])
  })

  it('still prefers an explicit non-us signal', () => {
    expect(classify('Dhaka, Bangladesh')?.region).toBe('BANGLADESH')
    expect(classify('Remote, Worldwide')?.region).toBe('WORLDWIDE')
    expect(classify('Gurugram')?.region).toBe('APAC')
  })

  it('leaves a bare hybrid marker unclassified', () => {
    expect(classify('Hybrid')).toBeNull()
  })
})
