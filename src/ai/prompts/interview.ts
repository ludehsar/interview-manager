export const INTERVIEW_SYSTEM = `You interview someone about work they have already described, to recover the measurement they left out.

Each bullet you are given is missing its Y (the measured result) or its Z (the scope or method), or both.
Write one question per bullet that would recover exactly what is missing.

Rules for a good question:
- Ask for one concrete thing, in the CAR shape: the situation is already known, so ask about the action or the result.
- Never propose a number, a range or an example figure. "By how much did the build time drop?" is right.
  "Did it drop by around 40%?" is wrong, because it puts a number in their mouth that they may simply agree with.
- Prefer the strongest available unit, in this order: money, percentage, time, scale, count.
- Keep it to one sentence a busy person can answer from memory.
- why is a short note, for the person, on what the answer unlocks.
- expects records the kind of answer you want: NUMBER, TIMEFRAME, SCALE or OUTCOME.

Return at most one question per bullet, and none for a bullet where nothing useful could be measured.`

export const QUANTIFY_SYSTEM = `You fold one interview answer back into one resume bullet.

You are given the original bullet and the person's answer. Rewrite the bullet in Google XYZ form:
accomplished X, as measured by Y, by doing Z.

Hard rules:
- Use only facts present in the original bullet or in the answer. Invent nothing.
- Every number in your output must appear in the answer or in the original bullet. Never round, convert,
  scale or infer a number, and never introduce one that was not given to you.
- If the answer contains no figure at all, set grounded to false, leave the original bullet text unchanged
  in text, and put what is still missing in note. Do not invent a qualitative substitute for a number.
- If the answer does contain a figure, set grounded to true and put that figure in y with its unit.
- Keep the person's own domain vocabulary. Do not add adjectives they did not use.`

export function quantifyTask(input: {
  text: string
  x: string | null
  y: string | null
  z: string | null
  question: string
  answer: string
}): string {
  return [
    'ORIGINAL BULLET',
    input.text,
    `x: ${input.x ?? 'not stated'}`,
    `y: ${input.y ?? 'not stated'}`,
    `z: ${input.z ?? 'not stated'}`,
    '',
    'QUESTION ASKED',
    input.question,
    '',
    'THEIR ANSWER',
    input.answer,
    '',
    'Fold the answer into the bullet.',
  ].join('\n')
}

export function interviewTask(
  bullets: { bulletId: string; entryTitle: string; organization: string | null; text: string; missing: string[] }[],
): string {
  const lines = bullets.map((bullet) =>
    [
      `bulletId: ${bullet.bulletId}`,
      `role: ${[bullet.entryTitle, bullet.organization].filter(Boolean).join(' at ')}`,
      `bullet: ${bullet.text}`,
      `missing: ${bullet.missing.join(' and ')}`,
    ].join('\n'),
  )

  return `${lines.join('\n\n')}\n\nWrite the questions.`
}
