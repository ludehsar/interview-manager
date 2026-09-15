export type RubricCriterion =
  | 'IMPACT'
  | 'QUANTIFICATION'
  | 'RELEVANCE'
  | 'CLARITY'
  | 'SCAN'
  | 'CREDIBILITY'
  | 'FORMAT'

export type RubricRow = {
  criterion: RubricCriterion
  label: string
  weight: number
  asks: string
}

export const RUBRIC: readonly RubricRow[] = [
  {
    criterion: 'IMPACT',
    label: 'Impact',
    weight: 25,
    asks: 'Does each bullet state an outcome the business felt, not a duty the person was assigned?',
  },
  {
    criterion: 'QUANTIFICATION',
    label: 'Quantification',
    weight: 20,
    asks: 'Are outcomes carried by a number, and is that number as high on money > percent > time > scale > count as the evidence allows?',
  },
  {
    criterion: 'RELEVANCE',
    label: 'Relevance',
    weight: 15,
    asks: 'Does the top third of the page carry the work a recruiter for this headline is hiring for?',
  },
  {
    criterion: 'CLARITY',
    label: 'Clarity',
    weight: 15,
    asks: 'Strong verb, concrete what, measured result — one idea per bullet, no jargon that hides the work?',
  },
  {
    criterion: 'SCAN',
    label: 'Six-second scan',
    weight: 10,
    asks: 'In six seconds: who they are, what they do, where they did it, and one number worth remembering?',
  },
  {
    criterion: 'CREDIBILITY',
    label: 'Credibility',
    weight: 10,
    asks: 'Do the claims hang together, and is every adjective earned by something stated next to it?',
  },
  {
    criterion: 'FORMAT',
    label: 'ATS format',
    weight: 5,
    asks: 'Standard headings, single column, real text, consistent dates, no orphaned fragments?',
  },
] as const

export const RUBRIC_CRITERIA = RUBRIC.map((row) => row.criterion) as [RubricCriterion, ...RubricCriterion[]]

export function rubricLabel(criterion: RubricCriterion): string {
  return RUBRIC.find((row) => row.criterion === criterion)?.label ?? criterion
}

export function rubricWeight(criterion: RubricCriterion): number {
  return RUBRIC.find((row) => row.criterion === criterion)?.weight ?? 0
}

export function scoreFromRubric(rows: { criterion: RubricCriterion; score: number }[]): number {
  const seen = new Map<RubricCriterion, number>()
  for (const row of rows) {
    if (!seen.has(row.criterion) && rubricWeight(row.criterion) > 0) {
      seen.set(row.criterion, Math.max(0, Math.min(100, row.score)))
    }
  }

  let weighted = 0
  let total = 0
  for (const [criterion, score] of seen) {
    const weight = rubricWeight(criterion)
    weighted += score * weight
    total += weight
  }

  if (total === 0) return 0
  return Math.round(weighted / total)
}

export function serializeRubric(): string {
  return RUBRIC.map((row) => `${row.criterion} (weight ${row.weight}) — ${row.label}: ${row.asks}`).join('\n')
}
