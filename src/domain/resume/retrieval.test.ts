import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { expandOneHopQuery, hybridChunkQuery, nodeVectorQuery } from './retrieval'

const dialect = new PgDialect()
const vector = Array.from({ length: 384 }, (_, index) => index / 384)

describe('hybridChunkQuery', () => {
  it('fuses a vector ranking with a full-text ranking', () => {
    const query = dialect.sqlToQuery(hybridChunkQuery({ userId: 'usr_1', query: 'kubernetes', vector, limit: 10 }))
    expect(query.sql).toMatch(/embedding <=> \$\d+::vector/)
    expect(query.sql).toMatch(/websearch_to_tsquery\('english', \$\d+\)/)
    expect(query.sql).toMatch(/sum\(1\.0 \/ \(\$\d+ \+ rnk\)\)/)
    expect(query.params).toContain('kubernetes')
  })

  it('always scopes to one user', () => {
    const query = dialect.sqlToQuery(hybridChunkQuery({ userId: 'usr_1', query: 'redis', vector, limit: 10 }))
    const scopes = query.sql.match(/user_id = \$\d+/g) ?? []
    expect(scopes.length).toBeGreaterThanOrEqual(2)
    expect(query.params).toContain('usr_1')
  })

  it('degrades to full text when there is no query vector', () => {
    const query = dialect.sqlToQuery(hybridChunkQuery({ userId: 'usr_1', query: 'redis', vector: null, limit: 10 }))
    expect(query.sql).not.toMatch(/embedding <=>/)
    expect(query.sql).toMatch(/websearch_to_tsquery/)
  })
})

describe('expandOneHopQuery', () => {
  it('walks both edge directions and stops after one hop', () => {
    const query = dialect.sqlToQuery(expandOneHopQuery('usr_1', ['kgn_1', 'kgn_2']))
    expect(query.sql).toMatch(/with recursive undirected/)
    expect(query.sql).toMatch(/select e\.source_id, e\.target_id/)
    expect(query.sql).toMatch(/select e\.target_id, e\.source_id/)
    expect(query.sql.match(/depth < 1/g)?.length).toBe(1)
  })

  it('references the recursive term once, which postgres requires', () => {
    const query = dialect.sqlToQuery(expandOneHopQuery('usr_1', ['kgn_1']))
    const recursiveTerm = query.sql.split(/walk\(id, depth\) as \(/)[1]
    expect(recursiveTerm.match(/join walk /g)?.length).toBe(1)
  })
})

describe('nodeVectorQuery', () => {
  it('orders by cosine distance and scopes to the user', () => {
    const query = dialect.sqlToQuery(nodeVectorQuery('usr_1', vector, 5))
    expect(query.sql).toMatch(/order by embedding <=> \$\d+::vector/)
    expect(query.sql).toMatch(/user_id = \$\d+/)
  })
})
