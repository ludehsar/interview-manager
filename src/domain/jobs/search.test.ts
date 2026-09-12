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
  it('always restricts to active canonical rows in a technical discipline', () => {
    const query = toSql({ sort: 'recent' })
    expect(query.sql).toContain('j.is_active')
    expect(query.sql).toContain('j.canonical_job_id is null')
    expect(query.sql).toMatch(/j\.discipline = any\(\$\d+::discipline\[\]\)/)
    expect(query.params).toContainEqual(['SOFTWARE', 'DATA', 'PRODUCT', 'DESIGN', 'IT'])
  })

  it('keeps the discipline gate on every facet branch', () => {
    for (const skip of ['region', 'seniority', 'skills', 'locations'] as const) {
      expect(toSql({ sort: 'recent', region: ['APAC'] }, skip).sql).toContain('j.discipline')
    }
  })

  it('parameterizes the full-text query', () => {
    const query = toSql({ sort: 'relevance', q: 'kubernetes terraform' })
    expect(query.sql).toMatch(/websearch_to_tsquery\('english', \$\d+\)/)
    expect(query.params).toContain('kubernetes terraform')
  })

  it('uses array containment for skills and enum arrays for facets', () => {
    const query = toSql({ sort: 'recent', skills: ['Go'], region: ['APAC'], seniority: ['SENIOR'] })
    expect(query.sql).toMatch(/j\.skills @> \$\d+::text\[\]/)
    expect(query.sql).toMatch(/j\.remote_region = any\(\$\d+::remote_region\[\]\)/)
    expect(query.sql).toMatch(/j\.seniority = any\(\$\d+::seniority\[\]\)/)
  })

  it('omits the skipped dimension so facet counts stay meaningful', () => {
    const query = toSql({ sort: 'recent', region: ['APAC'], seniority: ['SENIOR'] }, 'region')
    expect(query.sql).not.toContain('remote_region')
    expect(query.sql).toContain('j.seniority')
  })

  it('builds a bounded recency window', () => {
    const query = toSql({ sort: 'recent', postedWithinDays: 14 })
    expect(query.sql).toMatch(/make_interval\(days => \$\d+\)/)
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
