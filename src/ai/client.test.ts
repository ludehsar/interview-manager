import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { clampOversized, MODELS, priceUsage, rateForModel } from './client'

function parseWithClamp<S extends z.ZodType>(schema: S, raw: unknown) {
  const candidate = raw
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = schema.safeParse(candidate)
    if (result.success) return result.data
    if (clampOversized(candidate, result.error.issues as never) === 0) throw result.error
  }
  return schema.parse(candidate)
}

describe('clampOversized', () => {
  it('truncates a string the model wrote past its declared maximum', () => {
    const schema = z.object({ comment: z.string().max(10) })
    expect(parseWithClamp(schema, { comment: 'x'.repeat(50) })).toEqual({ comment: 'x'.repeat(10) })
  })

  it('truncates a nested string inside an array', () => {
    const schema = z.object({ rubric: z.array(z.object({ comment: z.string().max(4) })) })
    const parsed = parseWithClamp(schema, { rubric: [{ comment: 'ok' }, { comment: 'far too long' }] })
    expect(parsed).toEqual({ rubric: [{ comment: 'ok' }, { comment: 'far ' }] })
  })

  it('trims an array past its maximum length', () => {
    const schema = z.object({ notes: z.array(z.string()).max(2) })
    expect(parseWithClamp(schema, { notes: ['a', 'b', 'c', 'd'] })).toEqual({ notes: ['a', 'b'] })
  })

  it('leaves a valid payload untouched', () => {
    const schema = z.object({ comment: z.string().max(10) })
    const raw = { comment: 'fine' }
    expect(clampOversized(raw, [])).toBe(0)
    expect(parseWithClamp(schema, raw)).toEqual({ comment: 'fine' })
  })

  it('still rejects a failure clamping cannot fix', () => {
    const schema = z.object({ n: z.number() })
    expect(() => parseWithClamp(schema, { n: 'not a number' })).toThrow()
  })
})

describe('rateForModel', () => {
  it('prices every tier in the model map', () => {
    for (const model of Object.values(MODELS)) {
      expect(rateForModel(model).input).toBeGreaterThan(0)
    }
  })

  it('prices the dated ids the api returns', () => {
    expect(rateForModel('claude-haiku-4-5-20251001')).toEqual(rateForModel('claude-haiku-4-5'))
  })

  it('falls back to zero for an unknown model', () => {
    expect(rateForModel('claude-unknown-9')).toEqual({ input: 0, output: 0 })
  })
})

describe('priceUsage', () => {
  it('charges cache reads at a tenth and cache writes at 1.25x', () => {
    const usage = priceUsage('claude-haiku-4-5-20251001', {
      input_tokens: 1_000_000,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    })
    expect(usage.usd).toBeCloseTo(1 + 0.1 + 1.25, 6)
  })
})
