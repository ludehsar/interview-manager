import { serializeRubric } from '@/domain/resume/rubric'

export const RUBRIC_BLOCK = `## THE RUBRIC A SCREENER SCORES THIS RESUME WITH

${serializeRubric()}

## THE WRITING STANDARD

Google XYZ: every bullet is "accomplished X, measured by Y, by doing Z". x is the action, y is the
measured result with its number and unit, z is the method, scope or scale. A bullet whose evidence
states no number has an empty y and says what changed instead of inventing a figure.

Laszlo Bock: quantify or cut. An adjective that no number or fact next to it earns is noise.

Harvard OCS: strong verb, concrete what, result. Never open two bullets in one entry with the same verb,
and never open with "Responsible for", "Helped with", "Worked on" or "Assisted in".

Quantification hierarchy, best first: money > percent > time > scale > count. When the evidence offers
two numbers for one outcome, lead with the one higher on that list and keep the other in z.

Six-second scan: the first entry and its first bullet carry the strongest number on the page.

ATS: the headings are EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS and SKILLS, exactly those words.
One column, plain text, no tables, no abbreviations a parser would miss on first use.

## THE ANTI-FABRICATION INVARIANT

Every bullet cites the evidence node ids it rests on. Every number in a bullet must already appear in
a cited node, in that entry's own bullets, or in answer memory. A number that appears nowhere in the
evidence is a fabrication on a real person's resume, and the guard rejects the draft for it.
Rewriting, sharpening and re-ordering the person's own facts is the work. Adding a fact is not.`
