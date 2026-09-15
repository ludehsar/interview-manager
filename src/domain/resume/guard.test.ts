import { describe, expect, it } from 'vitest'
import { ResumeDocumentSchema } from '@/ai/schemas/resume'
import { resumeDocument } from './__fixtures__/document'
import { evidencePack } from './__fixtures__/pack'
import { guardResume, type GuardCode } from './guard'

const codes = (doc: ReturnType<typeof resumeDocument>): GuardCode[] =>
  guardResume(doc, evidencePack()).violations.map((violation) => violation.code)

describe('guardResume on a clean document', () => {
  const report = guardResume(resumeDocument(), evidencePack())

  it('passes', () => {
    expect(report.ok).toBe(true)
    expect(report.errors).toBe(0)
  })

  it('raises nothing at all', () => {
    expect(report.violations).toEqual([])
  })

  it('accepts the fixture as a valid resume document', () => {
    expect(ResumeDocumentSchema.safeParse(resumeDocument()).success).toBe(true)
  })
})

describe('guardResume catches fabrication', () => {
  it('flags a number that is in no cited evidence', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].text = 'Cut checkout p95 latency from 900 ms to 120 ms by moving reads to Redis'
    expect(codes(doc)).toContain('UNGROUNDED_NUMBER')
  })

  it('accepts a number that traces to a cited metric node', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].text = 'Cut checkout p95 latency to 240 ms for 1.2M monthly users on Redis'
    expect(codes(doc)).not.toContain('UNGROUNDED_NUMBER')
  })

  it('flags a citation to an evidence node that does not exist', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].evidenceNodeIds = ['kgn_ghost']
    expect(codes(doc)).toContain('EVIDENCE_ID_UNKNOWN')
  })

  it('flags an entry that is not in the profile', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].entryId = 'ent_invented'
    expect(codes(doc)).toContain('ENTRY_INVENTED')
  })

  it('flags a profile entry the resume left out', () => {
    const doc = resumeDocument()
    doc.sections[0].entries = []
    expect(codes(doc)).toContain('ENTRY_DROPPED')
  })

  it('flags a changed employer', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].organization = 'Globex'
    expect(codes(doc)).toContain('ORG_INVENTED')
  })

  it('flags a changed name', () => {
    const doc = resumeDocument()
    doc.basics.fullName = 'Someone Else'
    expect(codes(doc)).toContain('CONTACT_MISMATCH')
  })

  it('flags a bullet that claims a metric but has no Y or Z', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].z = ''
    expect(codes(doc)).toContain('XYZ_INCOMPLETE')
  })
})

describe('guardResume warnings', () => {
  it('warns about unevidenced puffery without failing the document', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].text =
      'World-class engineer who cut checkout p95 latency to 240 ms for 1.2M monthly users'
    const report = guardResume(doc, evidencePack())
    expect(report.violations.map((v) => v.code)).toContain('UNEVIDENCED_ADJECTIVE')
    expect(report.ok).toBe(true)
  })

  it('warns when a profile bullet was not carried over', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].sourceBulletId = null
    const report = guardResume(doc, evidencePack())
    expect(report.violations.map((v) => v.code)).toContain('BULLET_DROPPED')
  })

  it('warns on a bullet too short to say anything', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].text = 'Cut p95 to 240 ms'
    const report = guardResume(doc, evidencePack())
    expect(report.violations.map((v) => v.code)).toContain('BULLET_LENGTH')
  })
})

describe('guardResume and hidden content', () => {
  it('does not police a hidden bullet, because the section editor owns it', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].hidden = true
    doc.sections[0].entries[0].bullets[0].text = 'Cut latency to 11 ms, a number from nowhere at all here'
    expect(codes(doc)).not.toContain('UNGROUNDED_NUMBER')
  })

  it('still counts a hidden entry as present, so hiding is not dropping', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].hidden = true
    expect(codes(doc)).not.toContain('ENTRY_DROPPED')
  })
})
