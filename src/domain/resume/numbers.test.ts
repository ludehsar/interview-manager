import { describe, expect, it } from 'vitest'
import { extractNumbers, numbersSubsetOf } from './numbers'

const tech = new Set(['react', 'postgres', 'http', 'python'])

const values = (text: string) => extractNumbers(text, tech).map((token) => token.value)
const units = (text: string) => extractNumbers(text, tech).map((token) => token.unit)

describe('extractNumbers', () => {
  it('reads a currency amount with its symbol as the unit', () => {
    expect(extractNumbers('saved $40,000 a year')).toContainEqual(
      expect.objectContaining({ value: 40000, unit: '$' }),
    )
  })

  it('expands magnitude suffixes', () => {
    expect(values('$1.2M in savings')).toContain(1_200_000)
    expect(values('250k users')).toContain(250_000)
    expect(values('3bn events')).toContain(3_000_000_000)
  })

  it('keeps a percentage as a percentage', () => {
    expect(units('cut costs by 40%')).toContain('%')
    expect(units('cut costs by 40 percent')).toContain('%')
  })

  it('normalizes equivalent time units', () => {
    expect(units('took 6 minutes')).toContain('min')
    expect(units('took 6 mins')).toContain('min')
    expect(units('over 3 years')).toContain('y')
  })

  it('reads a latency figure', () => {
    expect(extractNumbers('p95 dropped to 240 ms')).toContainEqual(
      expect.objectContaining({ value: 240, unit: 'ms' }),
    )
  })

  it('ignores a bare calendar year', () => {
    expect(values('shipped in 2021')).toHaveLength(0)
    expect(values('from 2019 to 2023')).toHaveLength(0)
  })

  it('keeps a four digit number that carries a unit', () => {
    expect(values('served 2000 requests per second')).toContain(2000)
  })

  it('ignores a version number attached to a known technology', () => {
    expect(values('upgraded to React 19')).toHaveLength(0)
    expect(values('migrated to Postgres 17')).toHaveLength(0)
    expect(values('moved to HTTP 2')).toHaveLength(0)
  })

  it('still reads a real number in a sentence that also names a technology', () => {
    expect(values('upgraded React 19 across 40 components')).toEqual([40])
  })

  it('reads a multiplier', () => {
    expect(units('3x faster')).toContain('x')
  })
})

describe('numbersSubsetOf', () => {
  const allowed = extractNumbers('cut p95 latency to 240 ms for 1.2M users, saving $40k', tech)

  it('accepts a bullet whose numbers all trace to evidence', () => {
    const candidate = extractNumbers('Cut p95 latency to 240 ms', tech)
    expect(numbersSubsetOf(candidate, allowed)).toHaveLength(0)
  })

  it('accepts the same figure written with a different magnitude suffix', () => {
    const candidate = extractNumbers('reached 1,200,000 users', tech)
    expect(numbersSubsetOf(candidate, allowed)).toHaveLength(0)
  })

  it('rejects a number that appears nowhere in the evidence', () => {
    const candidate = extractNumbers('Cut p95 latency to 120 ms', tech)
    expect(numbersSubsetOf(candidate, allowed).map((token) => token.value)).toEqual([120])
  })

  it('rejects the right value carrying the wrong unit', () => {
    const candidate = extractNumbers('answered in 240 days', tech)
    expect(numbersSubsetOf(candidate, allowed)).toHaveLength(1)
  })

  it('treats a unitless figure as matching a united one, since prose often drops the unit', () => {
    const candidate = extractNumbers('handled 240 of them', tech)
    expect(numbersSubsetOf(candidate, allowed)).toHaveLength(0)
  })
})
