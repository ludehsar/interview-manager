import { describe, expect, it } from 'vitest'
import { inferEmploymentType, inferRoleType, inferSeniority, normalizeJob } from './normalize'
import { excerpt, htmlToText, truncateDescription } from './text'

const source = { id: 'greenhouse:acme', kind: 'greenhouse', identifier: 'acme', tier: 'A' as const }

describe('htmlToText', () => {
  it('converts markup to readable text and decodes entities', () => {
    expect(htmlToText('<p>Build&nbsp;things</p><ul><li>Ship&amp;iterate</li></ul>')).toBe('Build things\n- Ship&iterate')
  })

  it('drops scripts and styles', () => {
    expect(htmlToText('<script>alert(1)</script><p>Hello</p>')).toBe('Hello')
  })
})

describe('excerpt', () => {
  it('cuts on a word boundary and keeps the limit', () => {
    const text = `${'word '.repeat(100)}`
    const result = excerpt(text, 50)
    expect(result).not.toBeNull()
    expect((result as string).length).toBeLessThanOrEqual(53)
    expect(result).toMatch(/\.\.\.$/)
  })

  it('returns the text untouched when short', () => {
    expect(excerpt('short text')).toBe('short text')
  })
})

describe('truncateDescription', () => {
  it('caps the description length', () => {
    expect(truncateDescription('x'.repeat(30000))?.length).toBe(20000)
  })

  it('returns null for empty input', () => {
    expect(truncateDescription('   ')).toBeNull()
  })
})

describe('inference', () => {
  it('reads seniority from the title', () => {
    expect(inferSeniority('Senior Backend Engineer')).toBe('SENIOR')
    expect(inferSeniority('Staff Engineer')).toBe('STAFF')
    expect(inferSeniority('Engineering Intern')).toBe('INTERN')
    expect(inferSeniority('Backend Engineer')).toBe('UNKNOWN')
  })

  it('reads role type from the title', () => {
    expect(inferRoleType('Engineering Manager')).toBe('MANAGER')
    expect(inferRoleType('Senior Engineer')).toBe('IC')
  })

  it('prefers a supplied employment type', () => {
    expect(inferEmploymentType('anything', 'CONTRACT')).toBe('CONTRACT')
    expect(inferEmploymentType('This is a part-time role')).toBe('PART_TIME')
    expect(inferEmploymentType(null)).toBe('UNKNOWN')
  })
})

describe('normalizeJob', () => {
  it('produces a complete row from a parsed posting', () => {
    const job = normalizeJob(
      {
        externalId: '900',
        title: 'Senior Platform Engineer (Remote)',
        company: 'Acme, Inc.',
        locationRaw: 'Remote - Singapore',
        descriptionHtml: '<p>We run Kubernetes and Terraform on AWS.</p>',
        applyUrl: 'https://boards.greenhouse.io/acme/jobs/900',
        postedAt: new Date('2026-09-01T00:00:00Z'),
        salary: { raw: '$120,000 - $150,000 a year' },
      },
      source,
      { region: 'APAC', countries: ['SG'] },
    )

    expect(job.id).toHaveLength(64)
    expect(job.sourceId).toBe('greenhouse:acme')
    expect(job.seniority).toBe('SENIOR')
    expect(job.roleType).toBe('IC')
    expect(job.remoteRegion).toBe('APAC')
    expect(job.countries).toEqual(['SG'])
    expect(job.skills).toEqual(expect.arrayContaining(['Kubernetes', 'Terraform', 'AWS']))
    expect(job.salaryMinUsdMonth).toBe(10000)
    expect(job.descriptionText).toBe('We run Kubernetes and Terraform on AWS.')
    expect(job.atsKind).toBe('greenhouse')
  })

  it('is deterministic for the same input', () => {
    const parsed = {
      externalId: '1',
      title: 'Engineer',
      company: 'Acme',
      applyUrl: 'https://example.com/1',
      descriptionText: 'Build things',
    }
    const region = { region: 'WORLDWIDE' as const, countries: [] }
    expect(normalizeJob(parsed, source, region).contentHash).toBe(normalizeJob(parsed, source, region).contentHash)
  })
})

describe('htmlToText with escaped markup', () => {
  it('decodes entity-escaped html before stripping tags', () => {
    const escaped = '&lt;p&gt;&lt;strong&gt;Marketing Associate&lt;/strong&gt;&lt;/p&gt;&lt;p&gt;In a B2B SaaS environment&lt;/p&gt;'
    expect(htmlToText(escaped)).toBe('Marketing Associate\nIn a B2B SaaS environment')
  })

  it('leaves plain text with ampersands alone', () => {
    expect(htmlToText('<p>R&amp;D team</p>')).toBe('R&D team')
  })
})
