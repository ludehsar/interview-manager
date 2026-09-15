import { describe, expect, it } from 'vitest'
import { dateWarnings } from './date-warnings'

const today = new Date('2026-09-14T00:00:00Z')

describe('dateWarnings', () => {
  it('says nothing about a role that started earlier this year and is ongoing', () => {
    expect(
      dateWarnings([{ title: 'Contract Software Engineer', organization: 'Saleo', startDate: '2026-04', isCurrent: true }], today),
    ).toEqual([])
  })

  it('says nothing about a range that ended earlier this year', () => {
    expect(
      dateWarnings([{ title: 'Senior Integration Engineer', startDate: '2026-01', endDate: '2026-07' }], today),
    ).toEqual([])
  })

  it('flags a start that has not happened yet', () => {
    expect(dateWarnings([{ title: 'Engineer', startDate: '2026-11' }], today)).toEqual([
      'Engineer starts on 2026-11, which has not happened yet.',
    ])
  })

  it('flags an end that has not happened yet', () => {
    expect(dateWarnings([{ title: 'Engineer', organization: 'Acme', startDate: '2025-01', endDate: '2027-01' }], today)).toEqual([
      'Engineer at Acme ends on 2027-01, which has not happened yet.',
    ])
  })

  it('flags a range that ends before it starts', () => {
    expect(dateWarnings([{ title: 'Engineer', startDate: '2024-06', endDate: '2023-01' }], today)).toEqual([
      'Engineer ends on 2023-01, before it starts on 2024-06.',
    ])
  })

  it('flags a current role that also carries an end date', () => {
    expect(dateWarnings([{ title: 'Engineer', startDate: '2024-06', endDate: '2025-01', isCurrent: true }], today)).toEqual([
      'Engineer is marked current but also lists an end date of 2025-01.',
    ])
  })

  it('treats a bare year as the whole year, so this year is not future', () => {
    expect(dateWarnings([{ title: 'Engineer', startDate: '2026' }], today)).toEqual([])
    expect(dateWarnings([{ title: 'Engineer', startDate: '2027' }], today)).toHaveLength(1)
  })

  it('ignores a date it cannot read', () => {
    expect(dateWarnings([{ title: 'Engineer', startDate: 'summer', endDate: null }], today)).toEqual([])
  })
})
