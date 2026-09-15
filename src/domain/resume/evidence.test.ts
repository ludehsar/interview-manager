import { describe, expect, it } from 'vitest'
import { serializeEvidencePack, type EvidencePack } from './evidence'
import { evidencePack } from './__fixtures__/pack'

describe('serializeEvidencePack', () => {
  it('is byte identical across two serializations of the same pack', () => {
    expect(serializeEvidencePack(evidencePack())).toBe(serializeEvidencePack(evidencePack()))
  })

  it('carries no timestamp or other volatile value', () => {
    const text = serializeEvidencePack(evidencePack())
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
    expect(text).not.toMatch(/GMT|Z$/m)
  })

  it('emits every section the drafter is told to read', () => {
    const text = serializeEvidencePack(evidencePack())
    for (const heading of ['## BASICS', '## ENTRIES', '## GRAPH NODES', '## GRAPH EDGES', '## CHUNKS', '## ANSWER MEMORY']) {
      expect(text).toContain(heading)
    }
  })

  it('exposes node ids as the vocabulary a bullet must cite', () => {
    const text = serializeEvidencePack(evidencePack())
    expect(text).toContain('kgn_metric')
    expect(text).toContain('kgn_scale')
  })

  it('keeps a metric value and unit next to its node id', () => {
    expect(serializeEvidencePack(evidencePack())).toMatch(/kgn_metric \| METRIC \| 240 ms p95 \| 240 ms/)
  })

  it('exposes bullet ids so a draft can record sourceBulletId', () => {
    expect(serializeEvidencePack(evidencePack())).toContain('blt_1')
  })

  it('changes when the underlying evidence changes', () => {
    const changed: EvidencePack = evidencePack()
    changed.nodes[0].props.value = 999
    expect(serializeEvidencePack(changed)).not.toBe(serializeEvidencePack(evidencePack()))
  })

  it('does not depend on the order rows arrive in', () => {
    const shuffled: EvidencePack = evidencePack()
    shuffled.nodes.reverse()
    shuffled.entries[0].bullets.reverse()
    expect(serializeEvidencePack(shuffled)).toBe(serializeEvidencePack(evidencePack()))
  })
})
