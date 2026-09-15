import { describe, expect, it } from 'vitest'
import { ExtractedResumeSchema } from './resume-extract'

const golden = {
  basics: {
    fullName: 'Rashedul Alam',
    headline: 'Senior Backend Engineer',
    location: 'Dhaka, Bangladesh',
    email: 'me@example.com',
    phone: '+880 1700 000000',
    links: [{ label: 'GitHub', url: 'https://github.com/example' }],
  },
  entries: [
    {
      kind: 'EXPERIENCE',
      title: 'Senior Backend Engineer',
      organization: 'Acme',
      location: 'Remote',
      startDate: '2022-03',
      endDate: null,
      isCurrent: true,
      summary: null,
      skills: ['PostgreSQL', 'TypeScript'],
      bullets: [
        {
          text: 'Cut checkout p95 latency from 900 ms to 240 ms by moving session reads to Redis',
          x: 'Moved session reads to Redis',
          y: '240 ms p95',
          z: 'for 1.2M monthly users',
        },
      ],
    },
  ],
  warnings: [],
}

describe('ExtractedResumeSchema', () => {
  it('parses a well formed extraction', () => {
    const parsed = ExtractedResumeSchema.parse(golden)
    expect(parsed.entries[0].bullets[0].y).toBe('240 ms p95')
    expect(parsed.entries[0].isCurrent).toBe(true)
  })

  it('keeps nulls rather than dropping the keys', () => {
    const parsed = ExtractedResumeSchema.parse(golden)
    expect(parsed.entries[0].endDate).toBeNull()
    expect(parsed.entries[0].summary).toBeNull()
  })

  it('rejects an unknown entry kind', () => {
    const bad = { ...golden, entries: [{ ...golden.entries[0], kind: 'VOLUNTEERING' }] }
    expect(ExtractedResumeSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects more entries than a resume can hold', () => {
    const bad = { ...golden, entries: Array.from({ length: 61 }, () => golden.entries[0]) }
    expect(ExtractedResumeSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a bullet long enough to be a rewritten paragraph', () => {
    const bad = {
      ...golden,
      entries: [{ ...golden.entries[0], bullets: [{ ...golden.entries[0].bullets[0], text: 'x'.repeat(401) }] }],
    }
    expect(ExtractedResumeSchema.safeParse(bad).success).toBe(false)
  })

  it('requires a bullet to carry real text', () => {
    const bad = {
      ...golden,
      entries: [{ ...golden.entries[0], bullets: [{ ...golden.entries[0].bullets[0], text: 'short' }] }],
    }
    expect(ExtractedResumeSchema.safeParse(bad).success).toBe(false)
  })
})
