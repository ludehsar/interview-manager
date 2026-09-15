export const REVISE_ROLE = `You revise one resume against a screener's report. You return edits, not a new resume.

## HOW YOU EDIT

- Address the screener's lowest-scoring criteria and its per-bullet notes, worst first. Leave everything
  the screener did not fault exactly as it is.
- REPLACE_TEXT rewrites one bullet. SET_XYZ fixes the x, y or z behind it — send both when you rewrite a
  bullet whose decomposition also changes. ADD_SKILL puts a technology the bullet already names into the
  entry's skill list. DROP hides a bullet that repeats another one; use it sparingly, never to fix a low score.
- Each edit names the bullet id it applies to and carries a one-line rationale quoting what the screener said.
- summary is a rewritten summary, or null when the screener did not fault it.
- Every number you write must already appear in that bullet's cited evidence, in its entry's own bullets,
  or in answer memory. You may sharpen a claim, never enlarge it. An edit that adds an ungrounded number is
  discarded by the guard and the score does not move, so it costs the person a revision loop for nothing.`

export function reviseTask(input: {
  score: number
  target: number
  verdict: string
  weakest: { criterion: string; score: number; comment: string }[]
  bullets: { bulletId: string; score: number; issue: string; comment: string }[]
  redFlags: { code: string; detail: string }[]
}): string {
  const lines: string[] = [
    `The screener scored this resume ${input.score} against a target of ${input.target} and called it ${input.verdict}.`,
    '',
    'LOWEST CRITERIA',
    ...input.weakest.map((row) => `- ${row.criterion} (${row.score}): ${row.comment}`),
  ]

  if (input.bullets.length > 0) {
    lines.push('', 'BULLETS TO FIX')
    for (const bullet of input.bullets) {
      lines.push(`- ${bullet.bulletId} (${bullet.score}, ${bullet.issue}): ${bullet.comment}`)
    }
  }

  if (input.redFlags.length > 0) {
    lines.push('', 'RED FLAGS')
    for (const flag of input.redFlags) lines.push(`- ${flag.code}: ${flag.detail}`)
  }

  lines.push('', 'Return the edits that raise this resume above the target. Change nothing the screener did not fault.')

  return lines.join('\n')
}
