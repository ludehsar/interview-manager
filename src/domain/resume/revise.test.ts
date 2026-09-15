import { describe, expect, it } from 'vitest'
import type { ResumeEdit } from './edits'
import { resumeDocument } from './__fixtures__/document'
import { evidencePack } from './__fixtures__/pack'
import { guardResume } from './guard'
import { applySafeEdits, withSummary } from './revise'

const edit = (overrides: Partial<ResumeEdit>): ResumeEdit => ({
  bulletId: 'res_blt_1',
  op: 'REPLACE_TEXT',
  text: null,
  x: null,
  y: null,
  z: null,
  rationale: 'the screener asked for it',
  ...overrides,
})

describe('applySafeEdits', () => {
  it('applies an edit that keeps the resume grounded', () => {
    const result = applySafeEdits(
      resumeDocument(),
      [edit({ text: 'Halved checkout p95 latency to 240 ms for 1.2M monthly users by moving sessions to Redis' })],
      evidencePack(),
    )

    expect(result.applied).toHaveLength(1)
    expect(result.rejected).toEqual([])
    expect(result.doc.sections[0].entries[0].bullets[0].text).toContain('Halved checkout p95')
  })

  it('discards an edit that invents a number', () => {
    const result = applySafeEdits(
      resumeDocument(),
      [edit({ text: 'Cut checkout p95 latency to 90 ms for 4M monthly users by moving session reads to Redis' })],
      evidencePack(),
    )

    expect(result.applied).toEqual([])
    expect(result.rejected).toHaveLength(1)
    expect(result.doc).toEqual(resumeDocument())
  })

  it('keeps the safe half of a batch when one edit fabricates', () => {
    const result = applySafeEdits(
      resumeDocument(),
      [
        edit({ op: 'ADD_SKILL', text: 'Redis' }),
        edit({ text: 'Cut checkout p95 latency to 12 ms for 9M monthly users by moving session reads to Redis' }),
      ],
      evidencePack(),
    )

    expect(result.applied).toHaveLength(1)
    expect(result.rejected).toHaveLength(1)
    expect(result.doc.sections[0].entries[0].skills).toContain('Redis')
    expect(guardResume(result.doc, evidencePack()).ok).toBe(true)
  })

  it('leaves the document untouched when there is nothing to do', () => {
    const result = applySafeEdits(resumeDocument(), [], evidencePack())
    expect(result.doc).toEqual(resumeDocument())
  })

  it('never lets a revision loop make the guard worse', () => {
    const doc = resumeDocument()
    doc.sections[0].entries[0].bullets[0].evidenceNodeIds = ['kgn_missing']
    const before = guardResume(doc, evidencePack()).errors

    const result = applySafeEdits(
      doc,
      [edit({ text: 'Cut checkout p95 latency to 7 ms for 88M monthly users by moving session reads to Redis' })],
      evidencePack(),
    )

    expect(guardResume(result.doc, evidencePack()).errors).toBeLessThanOrEqual(before)
  })
})

describe('withSummary', () => {
  it('takes a rewritten summary', () => {
    const next = withSummary(
      resumeDocument(),
      { text: 'Backend engineer who cut checkout latency to 240 ms.', evidenceNodeIds: ['kgn_metric'] },
      evidencePack(),
    )
    expect(next.summary.text).toContain('240 ms')
  })

  it('keeps the old summary when the screener asked for none', () => {
    expect(withSummary(resumeDocument(), null, evidencePack())).toEqual(resumeDocument())
  })
})
