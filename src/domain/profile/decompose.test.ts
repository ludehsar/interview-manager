import { describe, expect, it } from 'vitest'
import { decomposeLocally } from './decompose'
import { MIN_DECOMPOSE_CHARS } from './xyz'

describe('decomposeLocally', () => {
  it('keeps a short bullet as the action and asks for nothing else', () => {
    expect(decomposeLocally('Shipped the thing')).toEqual({
      x: 'Shipped the thing',
      y: '',
      z: '',
      metricStatus: 'MISSING',
    })
  })

  it('is MISSING even with a figure in the text, because nothing fills Y', () => {
    expect(decomposeLocally('Cut build time to 90 seconds').metricStatus).toBe('MISSING')
  })

  it('does not spend a model call on a bullet too short to decompose', () => {
    expect('Shipped it'.length).toBeLessThan(MIN_DECOMPOSE_CHARS)
  })
})
