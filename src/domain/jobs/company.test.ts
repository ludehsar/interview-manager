import { describe, expect, it } from 'vitest'
import {
  companyDomainFromName,
  companyDomainFromText,
  companyHue,
  companyInitials,
  inferCompanyDomain,
  isValidDomain,
  normalizeDomain,
} from './company'
import { normalizeCompany } from './fingerprint'

describe('isValidDomain', () => {
  it('accepts ordinary registrable domains', () => {
    expect(isValidDomain('stripe.com')).toBe(true)
    expect(isValidDomain('brain-station-23.com')).toBe(true)
    expect(isValidDomain('example.co.uk')).toBe(true)
  })

  it('rejects anything that could point the proxy somewhere else', () => {
    expect(isValidDomain('localhost')).toBe(false)
    expect(isValidDomain('127.0.0.1')).toBe(false)
    expect(isValidDomain('stripe.com/../../etc/passwd')).toBe(false)
    expect(isValidDomain('stripe.com?x=1')).toBe(false)
    expect(isValidDomain('stripe com')).toBe(false)
    expect(isValidDomain('')).toBe(false)
    expect(isValidDomain(`${'a'.repeat(250)}.com`)).toBe(false)
  })
})

describe('normalizeDomain', () => {
  it('strips scheme, path, port and careers subdomains', () => {
    expect(normalizeDomain('https://www.stripe.com/jobs')).toBe('stripe.com')
    expect(normalizeDomain('careers.gitlab.com')).toBe('gitlab.com')
    expect(normalizeDomain('jobs.example.org:443')).toBe('example.org')
  })

  it('keeps a two-label domain intact', () => {
    expect(normalizeDomain('jobs.com')).toBe('jobs.com')
  })

  it('returns null for junk', () => {
    expect(normalizeDomain(null)).toBeNull()
    expect(normalizeDomain('  ')).toBeNull()
    expect(normalizeDomain('not a domain')).toBeNull()
  })
})

describe('inferCompanyDomain', () => {
  it('reads the company domain out of a company-hosted apply url', () => {
    expect(inferCompanyDomain('https://stripe.com/jobs/search?gh_jid=8172487')).toBe('stripe.com')
    expect(inferCompanyDomain('https://careers.acme.io/postings/42')).toBe('acme.io')
  })

  it('refuses applicant tracking and aggregator hosts', () => {
    expect(inferCompanyDomain('https://jobs.lever.co/palantir/abc')).toBeNull()
    expect(inferCompanyDomain('https://boards.greenhouse.io/acme/jobs/1')).toBeNull()
    expect(inferCompanyDomain('https://jobs.ashbyhq.com/linear/xyz')).toBeNull()
    expect(inferCompanyDomain('https://apply.workable.com/j/933DA8CE76')).toBeNull()
    expect(inferCompanyDomain('https://www.arbeitnow.com/jobs/companies/acme/dev')).toBeNull()
    expect(inferCompanyDomain('https://weworkremotely.com/remote-jobs/acme-dev')).toBeNull()
    expect(inferCompanyDomain('https://remotive.com/remote-jobs/dev-123')).toBeNull()
  })

  it('ignores non-http urls and junk', () => {
    expect(inferCompanyDomain('javascript:alert(1)')).toBeNull()
    expect(inferCompanyDomain('not a url')).toBeNull()
    expect(inferCompanyDomain(null)).toBeNull()
  })
})

describe('monogram helpers', () => {
  it('derives readable initials', () => {
    expect(companyInitials('Brain Station 23')).toBe('BS')
    expect(companyInitials('Stripe')).toBe('ST')
    expect(companyInitials('  ')).toBe('?')
  })

  it('picks a stable hue per company', () => {
    expect(companyHue('Stripe')).toBe(companyHue('Stripe'))
  })
})

describe('companyDomainFromName', () => {
  it('uses a company name that is itself a domain', () => {
    expect(companyDomainFromName('Monday.com')).toBe('monday.com')
    expect(companyDomainFromName('Checkout.com')).toBe('checkout.com')
    expect(companyDomainFromName('Lemon.io')).toBe('lemon.io')
  })

  it('ignores ordinary company names', () => {
    expect(companyDomainFromName('Brain Station 23')).toBeNull()
    expect(companyDomainFromName('Stripe')).toBeNull()
  })
})

describe('companyDomainFromText', () => {
  const text = (body: string) => companyDomainFromText('Zeta Global', body, normalizeCompany)

  it('accepts a url whose domain matches the company name', () => {
    expect(text('Apply now at https://zetaglobal.com/careers today.')).toBe('zetaglobal.com')
    expect(companyDomainFromText('LooseGrip', 'see https://www.loosegrip.net', normalizeCompany)).toBe('loosegrip.net')
  })

  it('rejects an unrelated url in the body', () => {
    expect(companyDomainFromText('garden3d', 'We built https://www.thelightphone.com for a client', normalizeCompany)).toBeNull()
  })

  it('rejects aggregator and ats links', () => {
    expect(text('Posted on https://weworkremotely.com/remote-jobs/zeta')).toBeNull()
    expect(text('Apply at https://boards.greenhouse.io/zetaglobal')).toBeNull()
  })

  it('returns null without a body or a match', () => {
    expect(text(null as unknown as string)).toBeNull()
    expect(text('No links here at all')).toBeNull()
  })
})
