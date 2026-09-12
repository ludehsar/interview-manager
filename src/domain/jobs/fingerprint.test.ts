import { describe, expect, it } from 'vitest'
import { sha256 } from '@/lib/ids'

describe('sha256', () => {
  it('is stable for the same input', () => {
    expect(sha256('greenhouse:acme:123')).toBe(sha256('greenhouse:acme:123'))
  })

  it('differs for different inputs', () => {
    expect(sha256('greenhouse:acme:123')).not.toBe(sha256('greenhouse:acme:124'))
  })
})
