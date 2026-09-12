import { describe, expect, it } from 'vitest'
import { dedupeFingerprint, jobId, normalizeCompany, normalizeTitle } from './fingerprint'

describe('jobId', () => {
  it('is stable across calls', () => {
    expect(jobId('greenhouse', 'vercel', '4321')).toBe(jobId('greenhouse', 'vercel', '4321'))
  })

  it('separates sources that share an external id', () => {
    expect(jobId('greenhouse', 'vercel', '4321')).not.toBe(jobId('lever', 'vercel', '4321'))
    expect(jobId('greenhouse', 'vercel', '4321')).not.toBe(jobId('greenhouse', 'linear', '4321'))
  })
})

describe('normalizeCompany', () => {
  it('drops legal suffixes and punctuation', () => {
    expect(normalizeCompany('Acme, Inc.')).toBe(normalizeCompany('Acme'))
    expect(normalizeCompany('Söderberg GmbH')).toBe('soderberg')
  })
})

describe('normalizeTitle', () => {
  it('strips remote, bracketed and gender markers but keeps seniority', () => {
    expect(normalizeTitle('Senior Engineer (Remote)')).toBe('senior engineer')
    expect(normalizeTitle('Backend Developer m/w/d')).toBe('backend developer')
    expect(normalizeTitle('Platform Engineer #12345')).toBe('platform engineer')
  })

  it('keeps symbol-bearing stacks intact', () => {
    expect(normalizeTitle('C++ Developer')).toBe('c++ developer')
    expect(normalizeTitle('.NET Engineer')).toBe('.net engineer')
  })
})

describe('dedupeFingerprint', () => {
  it('collapses the same posting listed by different sources', () => {
    expect(dedupeFingerprint('Acme, Inc.', 'Senior Engineer (Remote)')).toBe(
      dedupeFingerprint('Acme', 'Senior Engineer'),
    )
  })

  it('keeps distinct seniorities apart', () => {
    expect(dedupeFingerprint('Acme', 'Junior Engineer')).not.toBe(dedupeFingerprint('Acme', 'Senior Engineer'))
  })

  it('keeps distinct companies apart', () => {
    expect(dedupeFingerprint('Acme', 'Senior Engineer')).not.toBe(dedupeFingerprint('Globex', 'Senior Engineer'))
  })
})
