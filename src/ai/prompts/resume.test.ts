import { describe, expect, it } from 'vitest'
import { RUBRIC } from '@/domain/resume/rubric'
import { DRAFT_ROLE, DRAFT_TASK, repairTask } from './draft'
import { EXTRACT_SYSTEM, extractTask } from './extract'
import { REVISE_ROLE, reviseTask } from './revise'
import { RUBRIC_BLOCK } from './rubric'
import { SCREEN_ROLE, SCREEN_TASK } from './screen'

describe('the cached prefix', () => {
  it('is the same block for the drafter, the screener and the reviser, so each step reads the other steps cache', () => {
    for (const role of [DRAFT_ROLE, SCREEN_ROLE, REVISE_ROLE]) {
      expect(role).not.toContain(RUBRIC_BLOCK)
    }
  })

  it('carries the rubric, the frameworks and the anti-fabrication invariant', () => {
    for (const row of RUBRIC) expect(RUBRIC_BLOCK).toContain(row.criterion)
    expect(RUBRIC_BLOCK).toContain('Google XYZ')
    expect(RUBRIC_BLOCK).toContain('Quantification hierarchy')
    expect(RUBRIC_BLOCK).toContain('ANTI-FABRICATION')
  })

  it('names the sections the drafter has to fill and the task it has to do', () => {
    expect(DRAFT_ROLE).toContain('sourceBulletId')
    expect(DRAFT_TASK).toContain('evidence')
    expect(SCREEN_TASK).toContain('rubric criterion')
  })
})

describe('extractTask', () => {
  const task = extractTask(new Date('2026-09-14T10:00:00Z'))

  it('states the real date, because the model assumes an older one', () => {
    expect(task).toContain('Today is 2026-09-14')
  })

  it('leaves the judgement of whether a date has happened to the code', () => {
    expect(task).toContain('say nothing about whether it')
    expect(EXTRACT_SYSTEM).toContain('Never write a warning about a date being in the past or the future')
  })

  it('keeps the date out of the cached system block', () => {
    expect(EXTRACT_SYSTEM).not.toContain('2026')
    expect(EXTRACT_SYSTEM).not.toContain('Today is')
  })
})

describe('repairTask', () => {
  const task = repairTask({
    violations: [
      { code: 'UNGROUNDED_NUMBER', entryId: 'ent_a', bulletId: 'res_blt_1', message: '4M does not appear' },
      { code: 'ENTRY_DROPPED', entryId: 'ent_b', bulletId: null, message: 'Entry Globex is missing' },
    ],
  })

  it('quotes each violation with the id it applies to', () => {
    expect(task).toContain('UNGROUNDED_NUMBER [res_blt_1]: 4M does not appear')
    expect(task).toContain('ENTRY_DROPPED [ent_b]: Entry Globex is missing')
  })

  it('asks for the whole resume back, because an edit cannot add a dropped entry', () => {
    expect(task).toContain('Write the resume again, in full')
  })
})

describe('reviseTask', () => {
  const task = reviseTask({
    score: 72,
    target: 85,
    verdict: 'MAYBE',
    weakest: [{ criterion: 'Quantification', score: 60, comment: 'Two bullets have no number.' }],
    bullets: [{ bulletId: 'res_blt_1', score: 40, issue: 'NO_NUMBER', comment: 'Name the latency.' }],
    redFlags: [{ code: 'GAP', detail: 'Eleven months between roles.' }],
  })

  it('states the gap the reviser has to close', () => {
    expect(task).toContain('scored this resume 72 against a target of 85')
    expect(task).toContain('MAYBE')
  })

  it('hands over the criteria, the bullets and the red flags', () => {
    expect(task).toContain('Quantification (60): Two bullets have no number.')
    expect(task).toContain('res_blt_1 (40, NO_NUMBER): Name the latency.')
    expect(task).toContain('GAP: Eleven months between roles.')
  })

  it('tells the reviser to leave everything else alone', () => {
    expect(task).toContain('Change nothing the screener did not fault.')
    expect(REVISE_ROLE).toContain('You return edits, not a new resume.')
  })
})
