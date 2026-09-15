import { createHash } from 'node:crypto'
import { invokeJson } from '@/aws/lambda'
import { EMBEDDING_DIMENSIONS } from '@/db/schema'

const BATCH_SIZE = 64

export type EmbeddingProvider = 'cli' | 'lambda' | 'stub' | 'bedrock'

export function embeddingProvider(): EmbeddingProvider {
  const value = process.env.EMBEDDING_PROVIDER
  if (value === 'local' || value === undefined || value === '') return 'cli'
  if (value === 'cli' || value === 'lambda' || value === 'stub' || value === 'bedrock') return value
  throw new Error(`unknown EMBEDDING_PROVIDER ${value}`)
}

export function embeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS
}

function stubVector(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS)
  let digest = createHash('sha256').update(text).digest()
  let offset = 0

  for (let index = 0; index < EMBEDDING_DIMENSIONS; index += 1) {
    if (offset + 2 > digest.length) {
      digest = createHash('sha256').update(digest).digest()
      offset = 0
    }
    vector[index] = (digest.readUInt16BE(offset) / 65535) * 2 - 1
    offset += 2
  }

  const norm = Math.sqrt(vector.reduce((total, value) => total + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider = embeddingProvider()

  if (provider === 'stub') return texts.map(stubVector)
  if (provider === 'cli') {
    const { embedViaCli } = await import('./embed-cli')
    return embedViaCli(texts)
  }
  if (provider === 'lambda') {
    const arn = process.env.EMBED_FUNCTION_ARN
    if (!arn) throw new Error('EMBED_FUNCTION_ARN is not set')
    const result = await invokeJson<{ dimensions: number; vectors: number[][] }>(arn, { texts })
    return result.vectors
  }

  throw new Error('EMBEDDING_PROVIDER=bedrock is not implemented yet')
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const vectors: number[][] = []
  for (let index = 0; index < texts.length; index += BATCH_SIZE) {
    vectors.push(...(await embedBatch(texts.slice(index, index + BATCH_SIZE))))
  }

  for (const vector of vectors) {
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`expected ${EMBEDDING_DIMENSIONS} dimensions, provider returned ${vector.length}`)
    }
  }

  return vectors
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`
}
