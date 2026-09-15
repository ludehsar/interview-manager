import { RESUME_HEADINGS, visibleBullets, visibleEntries, type ResumeDocument } from '@/ai/schemas/resume'

export type AtsIssueCode =
  | 'MISSING_HEADING'
  | 'BULLET_NOT_PARSED'
  | 'CONTACT_NOT_PARSED'
  | 'EMPTY_TEXT_LAYER'
  | 'LOW_KEYWORD_COVERAGE'

export type AtsIssue = { code: AtsIssueCode; detail: string }

export type AtsReport = {
  score: number
  parsedChars: number
  headings: { expected: string[]; found: string[]; missing: string[] }
  coverage: { keyword: string; inResume: boolean }[]
  ratio: number
  bulletRoundTrip: { bulletId: string; found: boolean }[]
  issues: AtsIssue[]
}

const WEIGHTS = { bullets: 40, headings: 20, contact: 10, keywords: 30 }
const PREFIX_LENGTH = 40

export function normalizePdfText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/­/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

function usedHeadings(doc: ResumeDocument): string[] {
  return doc.sections
    .filter((section) => !section.hidden && section.entries.some((entry) => !entry.hidden))
    .map((section) => section.heading)
}

export function scoreAts(input: { pdfText: string; doc: ResumeDocument; keywords?: string[] }): AtsReport {
  const haystack = normalizePdfText(input.pdfText)
  const issues: AtsIssue[] = []

  if (haystack.length < 40) {
    issues.push({ code: 'EMPTY_TEXT_LAYER', detail: 'The PDF has almost no extractable text' })
  }

  const expected = usedHeadings(input.doc)
  const found = expected.filter((heading) => haystack.includes(heading.toLowerCase()))
  const missing = expected.filter((heading) => !found.includes(heading))
  for (const heading of missing) {
    issues.push({ code: 'MISSING_HEADING', detail: `Heading ${heading} did not survive the PDF` })
  }

  const bulletRoundTrip = visibleBullets(input.doc).map(({ bullet }) => {
    const prefix = normalizePdfText(bullet.text).slice(0, PREFIX_LENGTH)
    const parsed = prefix.length > 0 && haystack.includes(prefix)
    if (!parsed) {
      issues.push({ code: 'BULLET_NOT_PARSED', detail: `Bullet ${bullet.id} did not survive the PDF` })
    }
    return { bulletId: bullet.id, found: parsed }
  })

  const contactParts = [input.doc.basics.fullName, input.doc.basics.email].filter(
    (part): part is string => Boolean(part),
  )
  const contactFound = contactParts.filter((part) => haystack.includes(normalizePdfText(part)))
  if (contactFound.length < contactParts.length) {
    issues.push({ code: 'CONTACT_NOT_PARSED', detail: 'Name or email did not survive the PDF' })
  }

  const keywords = [...new Set((input.keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean))]
  const coverage = keywords.map((keyword) => ({
    keyword,
    inResume: haystack.includes(normalizePdfText(keyword)),
  }))
  const ratio = coverage.length === 0 ? 1 : coverage.filter((entry) => entry.inResume).length / coverage.length
  if (coverage.length > 0 && ratio < 0.5) {
    issues.push({ code: 'LOW_KEYWORD_COVERAGE', detail: `Only ${Math.round(ratio * 100)}% of keywords appear` })
  }

  const bulletScore =
    bulletRoundTrip.length === 0
      ? WEIGHTS.bullets
      : (bulletRoundTrip.filter((entry) => entry.found).length / bulletRoundTrip.length) * WEIGHTS.bullets
  const headingScore = expected.length === 0 ? WEIGHTS.headings : (found.length / expected.length) * WEIGHTS.headings
  const contactScore =
    contactParts.length === 0 ? WEIGHTS.contact : (contactFound.length / contactParts.length) * WEIGHTS.contact
  const keywordScore = ratio * WEIGHTS.keywords

  return {
    score: Math.round(bulletScore + headingScore + contactScore + keywordScore),
    parsedChars: haystack.length,
    headings: { expected, found, missing },
    coverage,
    ratio,
    bulletRoundTrip,
    issues,
  }
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const document = await getDocumentProxy(bytes)
  const { text } = await extractText(document, { mergePages: true })
  return Array.isArray(text) ? text.join('\n') : text
}

export function keywordsFromDocument(doc: ResumeDocument): string[] {
  return [...new Set(visibleEntries(doc).flatMap((entry) => entry.skills))]
}

export const ATS_HEADINGS = RESUME_HEADINGS
