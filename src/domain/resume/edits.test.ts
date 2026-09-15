import { describe, expect, it } from 'vitest'
import { applyEdits, setHidden, type ResumeEdit } from './edits'
import { resumeDocument } from './__fixtures__/document'

const edit = (overrides: Partial<ResumeEdit> & Pick<ResumeEdit, 'bulletId' | 'op'>): ResumeEdit => ({
  text: null,
  x: null,
  y: null,
  z: null,
  rationale: 'because',
  ...overrides,
})

describe('applyEdits', () => {
  it('replaces bullet text', () => {
    const next = applyEdits(resumeDocument(), [
      edit({ bulletId: 'res_blt_1', op: 'REPLACE_TEXT', text: 'Rewritten bullet text here' }),
    ])
    expect(next.sections[0].entries[0].bullets[0].text).toBe('Rewritten bullet text here')
  })

  it('leaves a field alone when the edit does not set it', () => {
    const original = resumeDocument()
    const next = applyEdits(original, [edit({ bulletId: 'res_blt_1', op: 'SET_XYZ', y: '200 ms p95' })])
    expect(next.sections[0].entries[0].bullets[0].y).toBe('200 ms p95')
    expect(next.sections[0].entries[0].bullets[0].z).toBe(original.sections[0].entries[0].bullets[0].z)
  })

  it('hides rather than deletes on DROP, so the content survives', () => {
    const next = applyEdits(resumeDocument(), [edit({ bulletId: 'res_blt_1', op: 'DROP' })])
    expect(next.sections[0].entries[0].bullets[0].hidden).toBe(true)
    expect(next.sections[0].entries[0].bullets).toHaveLength(1)
  })

  it('ignores an edit aimed at a bullet that is not there', () => {
    const original = resumeDocument()
    const next = applyEdits(original, [edit({ bulletId: 'res_blt_ghost', op: 'DROP' })])
    expect(next).toEqual(original)
  })

  it('does not mutate the document it was given', () => {
    const original = resumeDocument()
    const before = JSON.stringify(original)
    applyEdits(original, [edit({ bulletId: 'res_blt_1', op: 'REPLACE_TEXT', text: 'Something else entirely' })])
    expect(JSON.stringify(original)).toBe(before)
  })

  it('is order independent across disjoint bullets', () => {
    const a = edit({ bulletId: 'res_blt_1', op: 'REPLACE_TEXT', text: 'First rewrite of the bullet' })
    const b = edit({ bulletId: 'res_blt_ghost', op: 'DROP' })
    expect(applyEdits(resumeDocument(), [a, b])).toEqual(applyEdits(resumeDocument(), [b, a]))
  })
})

describe('setHidden', () => {
  it('hides a bullet without removing it', () => {
    const next = setHidden(resumeDocument(), { bulletId: 'res_blt_1' }, true)
    expect(next.sections[0].entries[0].bullets[0].hidden).toBe(true)
  })

  it('hides a whole section', () => {
    const next = setHidden(resumeDocument(), { sectionId: 'sec_experience' }, true)
    expect(next.sections[0].hidden).toBe(true)
  })
})
