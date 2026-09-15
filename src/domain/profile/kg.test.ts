import { describe, expect, it } from 'vitest'
import { KgExtractionSchema } from '@/ai/schemas/kg'
import { graphFromExtraction } from './kg'

const extraction = KgExtractionSchema.parse({
  nodes: [
    { key: 'r1', type: 'ROLE', label: 'Senior Backend Engineer', props: { value: null, unit: null, period: null, detail: null } },
    { key: 'c1', type: 'COMPANY', label: 'Acme', props: { value: null, unit: null, period: null, detail: null } },
    { key: 'm1', type: 'METRIC', label: '240 ms p95', props: { value: 240, unit: 'ms', period: null, detail: 'cut p95 to 240 ms' } },
    { key: 'dup', type: 'COMPANY', label: 'acme', props: { value: null, unit: null, period: null, detail: null } },
    { key: 'blank', type: 'SKILL', label: '   ', props: { value: null, unit: null, period: null, detail: null } },
  ],
  edges: [
    { source: 'r1', target: 'c1', type: 'AT_COMPANY' },
    { source: 'r1', target: 'm1', type: 'MEASURED_BY' },
    { source: 'r1', target: 'ghost', type: 'USED_SKILL' },
    { source: 'c1', target: 'dup', type: 'RELATED_TO' },
  ],
  chunks: [{ text: 'Senior Backend Engineer at Acme, cut checkout p95 latency from 900 ms to 240 ms.' }],
})

describe('graphFromExtraction', () => {
  const graph = graphFromExtraction(extraction, 'ent_1')

  it('drops a node whose label normalizes to nothing', () => {
    expect(graph.nodes.some((node) => node.label.trim() === '')).toBe(false)
    expect(graph.nodes).toHaveLength(4)
  })

  it('stamps every node with the entry it came from', () => {
    expect(graph.nodes.every((node) => node.entryId === 'ent_1')).toBe(true)
  })

  it('keeps the metric value and unit the model reported', () => {
    const metric = graph.nodes.find((node) => node.type === 'METRIC')
    expect(metric?.props.value).toBe(240)
    expect(metric?.props.unit).toBe('ms')
  })

  it('drops an edge pointing at a key the model never defined', () => {
    expect(graph.edges.some((edge) => edge.type === 'USED_SKILL')).toBe(false)
  })

  it('collapses two keys with the same type and normalized label into one self-edge and drops it', () => {
    expect(graph.edges.some((edge) => edge.source === edge.target)).toBe(false)
    expect(graph.edges).toHaveLength(2)
  })

  it('addresses edges by type and normalized label so the upsert key matches', () => {
    expect(graph.edges).toContainEqual({
      source: 'ROLE:senior backend engineer',
      target: 'COMPANY:acme',
      type: 'AT_COMPANY',
    })
  })
})
