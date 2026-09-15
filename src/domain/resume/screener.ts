import type { Screener } from '@/ai/schemas/screener'
import { rubricLabel, rubricWeight, scoreFromRubric } from './rubric'

export type ScreenerReport = Omit<Screener, 'rubric'> & {
  score: number
  rubric: { criterion: string; score: number; weight: number; comment: string }[]
}

export function toScreenerReport(screener: Screener): ScreenerReport {
  return {
    ...screener,
    score: scoreFromRubric(screener.rubric),
    rubric: screener.rubric.map((row) => ({
      criterion: rubricLabel(row.criterion),
      score: row.score,
      weight: rubricWeight(row.criterion),
      comment: row.comment,
    })),
  }
}

export function weakestCriteria(report: ScreenerReport, limit = 3): ScreenerReport['rubric'] {
  return [...report.rubric].sort((a, b) => a.score - b.score).slice(0, limit)
}
