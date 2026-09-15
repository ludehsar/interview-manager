import { describe, expect, it } from 'vitest'
import { ResumeDocumentSchema } from '@/ai/schemas/resume'
import { resumeDocument } from './__fixtures__/document'
import { resumeDraft } from './__fixtures__/draft'
import { evidencePack } from './__fixtures__/pack'
import { materializeDocument, serializeResume } from './document'
import { guardResume } from './guard'

describe('materializeDocument', () => {
  it('turns a clean draft into the expected document', () => {
    expect(materializeDocument(resumeDraft(), evidencePack())).toEqual(resumeDocument())
  })

  it('produces a document the schema and the guard both accept', () => {
    const doc = materializeDocument(resumeDraft(), evidencePack())
    expect(ResumeDocumentSchema.safeParse(doc).success).toBe(true)
    expect(guardResume(doc, evidencePack()).ok).toBe(true)
  })

  it('gives the same ids on every run, so edits and screener notes keep addressing the same bullet', () => {
    const pack = evidencePack()
    const first = materializeDocument(resumeDraft(), pack)
    const second = materializeDocument(resumeDraft(), pack)
    expect(second.sections[0].entries[0].bullets[0].id).toBe(first.sections[0].entries[0].bullets[0].id)
    expect(first.sections[0].entries[0].bullets[0].id).toBe('res_blt_1')
  })

  it('takes entry facts from the profile, never from the model', () => {
    const pack = evidencePack()
    pack.entries[0].organization = 'Globex'
    pack.entries[0].startDate = '2019-01'
    const doc = materializeDocument(resumeDraft(), pack)
    expect(doc.sections[0].entries[0].organization).toBe('Globex')
    expect(doc.sections[0].entries[0].startDate).toBe('2019-01')
  })

  it('takes contact details from the profile', () => {
    const pack = evidencePack()
    pack.basics.email = 'other@example.com'
    const doc = materializeDocument(resumeDraft(), pack)
    expect(doc.basics.email).toBe('other@example.com')
    expect(doc.basics.headline).toBe('Senior Backend Engineer')
  })

  it('derives metricStatus from the text instead of trusting the model', () => {
    const draft = resumeDraft()
    const bullet = draft.sections[0].entries[0].bullets[0]
    bullet.text = 'Moved session reads to Redis so checkout stopped timing out under load'
    bullet.y = ''
    bullet.z = ''
    const doc = materializeDocument(draft, evidencePack())
    expect(doc.sections[0].entries[0].bullets[0].metricStatus).toBe('MISSING')
  })

  it('numbers a bullet the model wrote from the graph rather than from a profile bullet', () => {
    const draft = resumeDraft()
    draft.sections[0].entries[0].bullets.push({
      ...draft.sections[0].entries[0].bullets[0],
      sourceBulletId: null,
    })
    const doc = materializeDocument(draft, evidencePack())
    expect(doc.sections[0].entries[0].bullets.map((bullet) => bullet.id)).toEqual(['res_blt_1', 'res_ent_a_n2'])
  })

  it('keeps the derived ids inside the schema bound at real id lengths', () => {
    const entryId = `ent_${'a'.repeat(32)}`
    const bulletId = `blt_${'b'.repeat(32)}`

    const pack = evidencePack()
    pack.entries[0].id = entryId
    pack.entries[0].bullets[0].id = bulletId

    const draft = resumeDraft()
    draft.sections[0].entries[0].entryId = entryId
    draft.sections[0].entries[0].bullets[0].sourceBulletId = bulletId
    draft.sections[0].entries[0].bullets.push({
      ...draft.sections[0].entries[0].bullets[0],
      sourceBulletId: null,
    })

    const doc = materializeDocument(draft, pack)
    expect(ResumeDocumentSchema.safeParse(doc).success).toBe(true)
    expect(doc.sections[0].entries[0].bullets.map((bullet) => bullet.id)).toEqual([
      `res_${bulletId}`,
      `res_${entryId}_n2`,
    ])
  })

  it('keeps one bullet when the model cites the same profile bullet twice', () => {
    const draft = resumeDraft()
    draft.sections[0].entries[0].bullets.push({ ...draft.sections[0].entries[0].bullets[0] })
    const doc = materializeDocument(draft, evidencePack())
    expect(doc.sections[0].entries[0].bullets).toHaveLength(1)
  })

  it('drops an entry the profile does not have, so an invented job never reaches the page', () => {
    const draft = resumeDraft()
    draft.sections[0].entries.push({ entryId: 'ent_invented', skills: [], bullets: [] })
    const doc = materializeDocument(draft, evidencePack())
    expect(doc.sections[0].entries.map((entry) => entry.entryId)).toEqual(['ent_a'])
  })

  it('places an entry once when the model lists it in two sections', () => {
    const draft = resumeDraft()
    draft.sections.push({ kind: 'PROJECT', heading: 'PROJECTS', entries: [draft.sections[0].entries[0]] })
    const doc = materializeDocument(draft, evidencePack())
    expect(doc.sections).toHaveLength(1)
  })
})

describe('serializeResume', () => {
  const text = serializeResume(resumeDocument())

  it('addresses every bullet by the id the screener has to quote back', () => {
    expect(text).toContain('[res_blt_1]')
  })

  it('carries the headings, the decomposition and the citations', () => {
    expect(text).toContain('## EXPERIENCE')
    expect(text).toContain('x: Moved session reads to Redis')
    expect(text).toContain('evidence: kgn_metric, kgn_scale')
  })

  it('leaves out what the user hid', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].hidden = true
    expect(serializeResume(doc)).not.toContain('[res_blt_1]')
  })
})
