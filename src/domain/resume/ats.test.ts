import { describe, expect, it } from 'vitest'
import { keywordsFromDocument, normalizePdfText, scoreAts } from './ats'
import { resumeDocument } from './__fixtures__/document'

const doc = resumeDocument()
const keywords = keywordsFromDocument(doc)

const goodText = [
  'Rashedul Alam',
  'Senior Backend Engineer',
  'Dhaka, Bangladesh · me@example.com',
  'EXPERIENCE',
  'Senior Backend Engineer, Acme  2022-03 -- Present',
  'Cut checkout p95 latency from 900 ms to 240 ms by moving session reads to Redis',
  'PostgreSQL, TypeScript',
].join('\n')

describe('normalizePdfText', () => {
  it('repairs ligatures a PDF text layer introduces', () => {
    expect(normalizePdfText('efﬁcient workﬂow')).toBe('efficient workflow')
  })

  it('collapses the whitespace a PDF scatters between glyphs', () => {
    expect(normalizePdfText('Cut   p95\n\nlatency')).toBe('cut p95 latency')
  })

  it('folds the dash variants a typesetter emits', () => {
    expect(normalizePdfText('2022–2023')).toBe('2022-2023')
  })
})

describe('scoreAts on a faithful PDF', () => {
  const report = scoreAts({ pdfText: goodText, doc, keywords })

  it('scores full marks', () => {
    expect(report.score).toBe(100)
  })

  it('finds every heading', () => {
    expect(report.headings.missing).toEqual([])
  })

  it('round-trips every visible bullet', () => {
    expect(report.bulletRoundTrip.every((entry) => entry.found)).toBe(true)
  })

  it('raises no issues', () => {
    expect(report.issues).toEqual([])
  })
})

describe('scoreAts catches a broken PDF', () => {
  it('flags a heading that did not survive', () => {
    const report = scoreAts({ pdfText: goodText.replace('EXPERIENCE', ''), doc, keywords })
    expect(report.issues.map((issue) => issue.code)).toContain('MISSING_HEADING')
    expect(report.score).toBeLessThan(100)
  })

  it('flags a bullet the extractor mangled', () => {
    const mangled = goodText.replace('Cut checkout p95 latency', 'Cut chekout p9S latency')
    const report = scoreAts({ pdfText: mangled, doc, keywords })
    expect(report.issues.map((issue) => issue.code)).toContain('BULLET_NOT_PARSED')
  })

  it('flags a missing contact line', () => {
    const report = scoreAts({ pdfText: goodText.replace('me@example.com', ''), doc, keywords })
    expect(report.issues.map((issue) => issue.code)).toContain('CONTACT_NOT_PARSED')
  })

  it('flags a PDF with no text layer at all', () => {
    const report = scoreAts({ pdfText: '', doc, keywords })
    expect(report.issues.map((issue) => issue.code)).toContain('EMPTY_TEXT_LAYER')
    expect(report.score).toBeLessThan(20)
  })

  it('flags weak keyword coverage', () => {
    const report = scoreAts({ pdfText: goodText, doc, keywords: ['Kubernetes', 'Terraform', 'Go', 'Rust'] })
    expect(report.issues.map((issue) => issue.code)).toContain('LOW_KEYWORD_COVERAGE')
  })
})

describe('scoreAts and hidden content', () => {
  it('does not expect a hidden bullet to appear in the PDF', () => {
    const hidden = resumeDocument()
    hidden.sections[0].entries[0].bullets[0].hidden = true
    const report = scoreAts({ pdfText: 'Rashedul Alam me@example.com', doc: hidden, keywords: [] })
    expect(report.bulletRoundTrip).toEqual([])
    expect(report.issues.map((issue) => issue.code)).not.toContain('BULLET_NOT_PARSED')
  })
})
