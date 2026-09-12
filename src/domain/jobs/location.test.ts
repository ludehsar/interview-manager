import { describe, expect, it } from 'vitest'
import {
  decodeLocationToken,
  locationTokenLabel,
  parseLocation,
  regionFromCountries,
  splitLocationTokens,
} from './location'

describe('parseLocation', () => {
  it('maps a Bangladeshi neighbourhood to its district and country', () => {
    const parsed = parseLocation('Gulshan 1, Dhaka')
    expect(parsed.cities).toEqual(['dhaka'])
    expect(parsed.countries).toEqual(['BD'])
    expect(parsed.workplaceType).toBe('ONSITE')
  })

  it('handles punctuation variants from the source feed', () => {
    expect(parseLocation('Cox`s Bazar').cities).toEqual(['cox-s-bazar'])
    expect(parseLocation('Chittagong EPZ').cities).toEqual(['chattogram'])
  })

  it('collects every location in a multi-location posting', () => {
    const parsed = parseLocation('Berlin, Germany | London, UK | Remote')
    expect(parsed.cities).toEqual(['berlin', 'london'])
    expect(parsed.countries).toEqual(['DE', 'GB'])
    expect(parsed.workplaceType).toBe('REMOTE')
  })

  it('reads a US state abbreviation as a country', () => {
    const parsed = parseLocation('Austin, TX')
    expect(parsed.countries).toEqual(['US'])
  })

  it('prefers an explicit workplace hint over the location text', () => {
    expect(parseLocation('Dhaka', { workplaceHint: 'Home Or Office' }).workplaceType).toBe('HYBRID')
    expect(parseLocation('Dhaka', { workplaceHint: 'Home' }).workplaceType).toBe('REMOTE')
    expect(parseLocation('Dhaka', { workplaceHint: 'Office' }).workplaceType).toBe('ONSITE')
  })

  it('treats hybrid as distinct from remote', () => {
    expect(parseLocation('Hybrid - Singapore').workplaceType).toBe('HYBRID')
    expect(parseLocation('Remote - Singapore').workplaceType).toBe('REMOTE')
  })

  it('leaves the workplace unknown when nothing places the role', () => {
    expect(parseLocation('Worldwide').workplaceType).toBe('UNKNOWN')
    expect(parseLocation(null)).toEqual({ cities: [], countries: [], workplaceType: 'UNKNOWN' })
  })

  it('falls back to the adapter country only when nothing else resolves', () => {
    expect(parseLocation('Nabinagar', { fallbackCountry: 'BD' }).countries).toEqual(['BD'])
    expect(parseLocation('Mongolia', { fallbackCountry: 'BD' }).countries).toEqual(['MN'])
  })

  it('merges countries supplied by the region classifier', () => {
    expect(parseLocation('Dhaka', { seedCountries: ['IN'] }).countries).toEqual(['BD', 'IN'])
  })
})

describe('regionFromCountries', () => {
  it('derives a region from resolved countries', () => {
    expect(regionFromCountries([])).toBe('UNKNOWN')
    expect(regionFromCountries(['BD'])).toBe('BANGLADESH')
    expect(regionFromCountries(['BD', 'IN'])).toBe('APAC')
    expect(regionFromCountries(['US', 'BD'])).toBe('REGION_LOCKED')
  })
})

describe('location tokens', () => {
  it('round-trips city and country tokens', () => {
    expect(decodeLocationToken('city:dhaka')).toEqual({ kind: 'city', value: 'dhaka' })
    expect(decodeLocationToken('country:bd')).toEqual({ kind: 'country', value: 'BD' })
    expect(decodeLocationToken('region:apac')).toBeNull()
    expect(decodeLocationToken('dhaka')).toBeNull()
  })

  it('splits mixed tokens into the two array filters', () => {
    expect(splitLocationTokens(['city:dhaka', 'country:US', 'city:dhaka', 'bogus'])).toEqual({
      cities: ['dhaka'],
      countries: ['US'],
    })
  })

  it('labels tokens for the filter chips', () => {
    expect(locationTokenLabel('city:dhaka')).toBe('Dhaka, Bangladesh')
    expect(locationTokenLabel('country:US')).toBe('United States')
  })
})
