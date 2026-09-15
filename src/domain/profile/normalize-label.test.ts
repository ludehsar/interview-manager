import { describe, expect, it } from 'vitest'
import { normalizeLabel } from './normalize-label'

describe('normalizeLabel', () => {
  it('is idempotent', () => {
    const once = normalizeLabel('Amazon Web Services')
    expect(normalizeLabel(once)).toBe(once)
  })

  it('collapses case, punctuation and whitespace', () => {
    expect(normalizeLabel('React.js')).toBe(normalizeLabel('react js'))
    expect(normalizeLabel('  Node   JS  ')).toBe('node js')
  })

  it('keeps the characters that distinguish a technology', () => {
    expect(normalizeLabel('C++')).toBe('c++')
    expect(normalizeLabel('C#')).toBe('c#')
  })

  it('strips diacritics', () => {
    expect(normalizeLabel('Café Systèmes')).toBe('cafe systeme')
  })

  it('folds a plural onto its stem only when the stem is long enough', () => {
    expect(normalizeLabel('Microservices')).toBe(normalizeLabel('Microservice'))
    expect(normalizeLabel('AWS')).toBe('aws')
    expect(normalizeLabel('Ops')).toBe('ops')
  })

  it('leaves a double-s word alone', () => {
    expect(normalizeLabel('Access')).toBe('access')
  })
})
