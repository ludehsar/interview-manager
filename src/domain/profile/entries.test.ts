import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { reorderBulletsQuery, reorderEntriesQuery } from './entries'

const dialect = new PgDialect()

describe('reorderEntriesQuery', () => {
  const query = dialect.sqlToQuery(reorderEntriesQuery('usr_1', 'EXPERIENCE', ['ent_b', 'ent_a', 'ent_c']))

  it('rewrites every position in one statement', () => {
    expect(query.sql).toMatch(/update profile_entries as p/)
    expect(query.sql).toMatch(/from \(values \(\$\d+::text, \$\d+::int\), /)
    expect(query.sql).toMatch(/as v\(id, ord\)/)
  })

  it('scopes the update to the owner and the kind', () => {
    expect(query.sql).toMatch(/p\.user_id = \$\d+/)
    expect(query.sql).toMatch(/p\.kind = \$\d+::entry_kind/)
    expect(query.params).toContain('usr_1')
    expect(query.params).toContain('EXPERIENCE')
  })

  it('types the values columns so sort_order stays an integer', () => {
    expect(query.sql).toMatch(/\$\d+::int\)/)
  })

  it('pairs each id with its position in order', () => {
    expect(query.params.slice(0, 6)).toEqual(['ent_b', 0, 'ent_a', 1, 'ent_c', 2])
  })
})

describe('reorderBulletsQuery', () => {
  const query = dialect.sqlToQuery(reorderBulletsQuery('usr_1', 'ent_a', ['blt_2', 'blt_1']))

  it('scopes the update to the owner and the entry', () => {
    expect(query.sql).toMatch(/update entry_bullets as b/)
    expect(query.sql).toMatch(/b\.user_id = \$\d+/)
    expect(query.sql).toMatch(/b\.entry_id = \$\d+/)
    expect(query.params).toEqual(['blt_2', 0, 'blt_1', 1, 'usr_1', 'ent_a'])
  })
})
