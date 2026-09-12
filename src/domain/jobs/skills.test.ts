import { describe, expect, it } from 'vitest'
import { extractSkills } from './skills'

describe('extractSkills', () => {
  it('matches symbol-bearing stacks', () => {
    const skills = extractSkills('Software Engineer', 'We use C++, C#, .NET and Node.js across the platform.')
    expect(skills).toContain('C++')
    expect(skills).toContain('C#')
    expect(skills).toContain('.NET')
    expect(skills).toContain('Node.js')
  })

  it('does not treat prose as a stack', () => {
    const skills = extractSkills('Growth Lead', 'You will own our go to market motion across the Rust Belt.')
    expect(skills).not.toContain('Go')
    expect(skills).not.toContain('Rust')
  })

  it('matches go and rust when the context is technical', () => {
    const skills = extractSkills('Backend Engineer', 'Our services are written in Go and Rust.')
    expect(skills).toContain('Go')
    expect(skills).toContain('Rust')
  })

  it('reads the title as well as the description', () => {
    expect(extractSkills('Senior Kubernetes Engineer', null)).toContain('Kubernetes')
  })

  it('caps the number of skills', () => {
    const description = 'react vue angular svelte python django flask fastapi java kotlin scala php ruby swift dart'
    expect(extractSkills('Engineer', description, 5)).toHaveLength(5)
  })
})
