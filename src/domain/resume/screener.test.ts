import { describe, expect, it } from 'vitest'
import { ScreenerSchema, type Screener } from '@/ai/schemas/screener'
import { toScreenerReport, weakestCriteria } from './screener'

function screener(overrides: Partial<Screener> = {}): Screener {
  return {
    verdict: 'YES',
    sixSecondScan: { passes: true, notes: 'The first bullet carries the strongest number.' },
    rubric: [
      { criterion: 'IMPACT', score: 90, comment: 'Outcomes, not duties.' },
      { criterion: 'QUANTIFICATION', score: 60, comment: 'Two bullets have no number.' },
      { criterion: 'RELEVANCE', score: 80, comment: 'Backend work leads the page.' },
      { criterion: 'CLARITY', score: 85, comment: 'One idea per bullet.' },
      { criterion: 'SCAN', score: 70, comment: 'The headline could name the stack.' },
      { criterion: 'CREDIBILITY', score: 95, comment: 'Every claim is evidenced.' },
      { criterion: 'FORMAT', score: 100, comment: 'Standard headings throughout.' },
    ],
    perBullet: [{ bulletId: 'res_blt_1', score: 88, issue: 'NONE', comment: 'Quotable.' }],
    redFlags: [],
    ...overrides,
  }
}

describe('toScreenerReport', () => {
  it('scores from the rubric weights rather than trusting a number the model wrote', () => {
    expect(toScreenerReport(screener()).score).toBe(81)
  })

  it('labels each criterion and carries its weight for the score panel', () => {
    const report = toScreenerReport(screener())
    expect(report.rubric[4]).toEqual({
      criterion: 'Six-second scan',
      score: 70,
      weight: 10,
      comment: 'The headline could name the stack.',
    })
  })

  it('keeps the verdict, the scan and the per-bullet notes the reviser acts on', () => {
    const report = toScreenerReport(screener({ verdict: 'MAYBE' }))
    expect(report.verdict).toBe('MAYBE')
    expect(report.sixSecondScan.passes).toBe(true)
    expect(report.perBullet[0].bulletId).toBe('res_blt_1')
  })

  it('survives a screener that scored nothing', () => {
    expect(toScreenerReport(screener({ rubric: [] })).score).toBe(0)
  })

  it('accepts the fixture as valid screener output', () => {
    expect(ScreenerSchema.safeParse(screener()).success).toBe(true)
  })
})

describe('weakestCriteria', () => {
  it('hands the reviser the lowest scores first', () => {
    expect(weakestCriteria(toScreenerReport(screener())).map((row) => row.criterion)).toEqual([
      'Quantification',
      'Six-second scan',
      'Relevance',
    ])
  })
})
