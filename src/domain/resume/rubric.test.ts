import { describe, expect, it } from 'vitest'
import { RUBRIC, rubricLabel, rubricWeight, scoreFromRubric, serializeRubric } from './rubric'

describe('the screening rubric', () => {
  it('weights sum to 100', () => {
    expect(RUBRIC.reduce((total, row) => total + row.weight, 0)).toBe(100)
  })

  it('scores a full sheet as the weighted average', () => {
    const rows = RUBRIC.map((row) => ({ criterion: row.criterion, score: row.criterion === 'IMPACT' ? 50 : 90 }))
    expect(scoreFromRubric(rows)).toBe(80)
  })

  it('renormalises when the screener skips a criterion', () => {
    expect(scoreFromRubric([{ criterion: 'IMPACT', score: 80 }])).toBe(80)
  })

  it('ignores a criterion it does not know', () => {
    const rows = [
      { criterion: 'IMPACT' as const, score: 60 },
      { criterion: 'VIBES' as unknown as 'IMPACT', score: 100 },
    ]
    expect(scoreFromRubric(rows)).toBe(60)
  })

  it('keeps the first score for a repeated criterion', () => {
    expect(
      scoreFromRubric([
        { criterion: 'IMPACT', score: 40 },
        { criterion: 'IMPACT', score: 100 },
      ]),
    ).toBe(40)
  })

  it('clamps a score outside 0-100', () => {
    expect(scoreFromRubric([{ criterion: 'IMPACT', score: 140 }])).toBe(100)
    expect(scoreFromRubric([{ criterion: 'IMPACT', score: -20 }])).toBe(0)
  })

  it('scores an empty sheet as zero rather than dividing by zero', () => {
    expect(scoreFromRubric([])).toBe(0)
  })

  it('names every criterion in the serialized rubric', () => {
    const text = serializeRubric()
    for (const row of RUBRIC) {
      expect(text).toContain(row.criterion)
      expect(text).toContain(row.label)
    }
  })

  it('resolves labels and weights', () => {
    expect(rubricLabel('SCAN')).toBe('Six-second scan')
    expect(rubricWeight('IMPACT')).toBe(25)
  })
})
