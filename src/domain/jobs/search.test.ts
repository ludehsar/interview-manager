import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { buildConditions, decodeCursor, encodeCursor, type JobFilters } from './search'

const dialect = new PgDialect()

function toSql(filters: JobFilters, skip?: keyof JobFilters) {
  const conds = buildConditions(filters, skip)
  return dialect.sqlToQuery(sql.join(conds, sql` and `))
}

describe('cursors', () => {
  it('round-trips a recency cursor', () => {
    const cursor = { s: 'recent' as const, t: '2026-09-01T00:00:00.000Z', i: 'abc' }
    expect(decodeCursor(encodeCursor(cursor), 'recent')).toEqual(cursor)
  })

  it('round-trips a relevance cursor with its rank', () => {
    const cursor = { s: 'relevance' as const, t: '2026-09-01T00:00:00.000Z', i: 'abc', r: 0.42 }
    expect(decodeCursor(encodeCursor(cursor), 'relevance')).toEqual(cursor)
  })

  it('discards a cursor from a different sort', () => {
    const cursor = encodeCursor({ s: 'recent', t: '2026-09-01T00:00:00.000Z', i: 'abc' })
    expect(decodeCursor(cursor, 'relevance')).toBeNull()
  })

  it('discards malformed input', () => {
    expect(decodeCursor('not-base64!!', 'recent')).toBeNull()
    expect(decodeCursor(Buffer.from('{}').toString('base64url'), 'recent')).toBeNull()
    expect(decodeCursor(null, 'recent')).toBeNull()
  })
})

describe('buildConditions', () => {
  it('always restricts to active canonical rows', () => {
    const query = toSql({ sort: 'recent' })
    expect(query.sql).toContain('j.is_active')
    expect(query.sql).toContain('j.canonical_job_id is null')
  })

  it('parameterizes the full-text query', () => {
    const query = toSql({ sort: 'relevance', q: 'kubernetes terraform' })
    expect(query.sql).toContain("websearch_to_tsquery('english', $1)")
    expect(query.params).toContain('kubernetes terraform')
  })

  it('uses array containment for skills and enum arrays for facets', () => {
    const query = toSql({ sort: 'recent', skills: ['Go'], region: ['APAC'], seniority: ['SENIOR'] })
    expect(query.sql).toContain('j.skills @> $3::text[]')
    expect(query.sql).toContain('j.remote_region = any($1::remote_region[])')
    expect(query.sql).toContain('j.seniority = any($2::seniority[])')
  })

  it('omits the skipped dimension so facet counts stay meaningful', () => {
    const query = toSql({ sort: 'recent', region: ['APAC'], seniority: ['SENIOR'] }, 'region')
    expect(query.sql).not.toContain('remote_region')
    expect(query.sql).toContain('j.seniority')
  })

  it('builds a bounded recency window', () => {
    const query = toSql({ sort: 'recent', postedWithinDays: 14 })
    expect(query.sql).toContain('make_interval(days => $1)')
    expect(query.params).toContain(14)
  })
})

describe('facet scoping', () => {
  it('drops only the facet dimension, keeping every other filter', () => {
    const filters: JobFilters = { sort: 'recent', region: ['APAC'], seniority: ['SENIOR'], tier: ['A'] }

    const regionFacet = toSql(filters, 'region')
    expect(regionFacet.sql).not.toContain('remote_region')
    expect(regionFacet.sql).toContain('j.seniority')
    expect(regionFacet.sql).toContain('j.tier')

    const seniorityFacet = toSql(filters, 'seniority')
    expect(seniorityFacet.sql).toContain('remote_region')
    expect(seniorityFacet.sql).not.toContain('j.seniority')
    expect(seniorityFacet.sql).toContain('j.tier')
  })
})
