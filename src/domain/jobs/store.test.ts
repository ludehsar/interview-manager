import { describe, expect, it } from 'vitest'
import { toInsert, UPSERT_SET } from './store'
import type { NormalizedJob } from './types'

const job: NormalizedJob = {
  id: 'job-1',
  sourceId: 'greenhouse:acme',
  sourceKind: 'greenhouse',
  tier: 'A',
  externalId: '1',
  title: 'Engineer',
  company: 'Acme',
  companyDomain: null,
  locationRaw: 'Remote',
  remoteRegion: 'WORLDWIDE',
  countries: [],
  cities: [],
  workplaceType: 'REMOTE',
  discipline: 'SOFTWARE',
  employmentType: 'FULL_TIME',
  seniority: 'SENIOR',
  roleType: 'IC',
  skills: ['Go'],
  salaryMinUsdMonth: null,
  salaryMaxUsdMonth: null,
  salaryRaw: null,
  descriptionText: 'Build things',
  excerpt: 'Build things',
  applyUrl: 'https://example.com/1',
  atsKind: 'greenhouse',
  postedAt: null,
  fingerprint: 'fp-1',
  contentHash: 'hash-1',
}

describe('upsert set clause', () => {
  const columns = Object.keys(UPSERT_SET)

  it('never overwrites first_seen_at on conflict', () => {
    expect(columns).not.toContain('firstSeenAt')
  })

  it('never overwrites the embedding on conflict', () => {
    expect(columns).not.toContain('embedding')
    expect(columns).not.toContain('embeddedAt')
  })

  it('never overwrites the collapse pointer on conflict', () => {
    expect(columns).not.toContain('canonicalJobId')
  })

  it('advances last_seen_at and revives the row', () => {
    expect(columns).toEqual(expect.arrayContaining(['lastSeenAt', 'isActive', 'closedAt']))
  })

  it('refreshes every volatile field the source owns', () => {
    expect(columns).toEqual(
      expect.arrayContaining(['title', 'company', 'locationRaw', 'remoteRegion', 'skills', 'descriptionText', 'applyUrl']),
    )
  })

  it('keeps a stored description when this sweep did not fetch the detail page', () => {
    const text = (fragment: { queryChunks: unknown[] }) =>
      fragment.queryChunks
        .map((chunk) => (typeof chunk === 'object' && chunk !== null && 'value' in chunk ? chunk.value : ''))
        .join('')
    expect(text(UPSERT_SET.descriptionText)).toContain('coalesce(excluded.description_text,')
    expect(text(UPSERT_SET.excerpt)).toContain('coalesce(excluded.excerpt,')
  })

  it('keeps a previously known posted_at when the source stops sending one', () => {
    const { queryChunks } = UPSERT_SET.postedAt
    const text = queryChunks.map((chunk) => (typeof chunk === 'object' && 'value' in chunk ? chunk.value : '')).join('')
    expect(text).toContain('coalesce(excluded.posted_at,')
  })
})

describe('toInsert', () => {
  it('stamps both timestamps with the sweep time', () => {
    const seenAt = new Date('2026-09-01T00:00:00Z')
    const row = toInsert(job, seenAt)
    expect(row.firstSeenAt).toBe(seenAt)
    expect(row.lastSeenAt).toBe(seenAt)
    expect(row.isActive).toBe(true)
  })
})
