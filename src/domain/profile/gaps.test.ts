import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { gapBulletsQuery, MAX_ANSWERS_PER_BULLET } from './gaps'

const dialect = new PgDialect()
const query = dialect.sqlToQuery(gapBulletsQuery('usr_1', 5))

describe('gapBulletsQuery', () => {
  it('selects bullets with no metric or a missing Y or Z', () => {
    expect(query.sql).toMatch(/b\.metric_status = 'MISSING'/)
    expect(query.sql).toMatch(/b\.y is null or b\.y = ''/)
    expect(query.sql).toMatch(/b\.z is null or b\.z = ''/)
  })

  it('only interviews about work, not education or certifications', () => {
    expect(query.sql).toMatch(/e\.kind in \('EXPERIENCE', 'PROJECT'\)/)
  })

  it('stops resurfacing a bullet once it has been asked about enough', () => {
    expect(query.sql).toMatch(/coalesce\(a\.answers, 0\) < \$\d+/)
    expect(query.params).toContain(MAX_ANSWERS_PER_BULLET)
  })

  it('scopes every table it touches to one user', () => {
    expect(query.sql.match(/user_id = \$\d+/g)?.length).toBe(3)
  })

  it('asks in the order the profile is laid out', () => {
    expect(query.sql).toMatch(/order by e\.sort_order, b\.sort_order/)
  })
})
