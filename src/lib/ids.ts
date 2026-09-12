import { createHash, randomUUID } from 'node:crypto'

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}
