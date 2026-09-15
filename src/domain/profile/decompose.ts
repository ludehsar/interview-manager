import { generateStructured } from '@/ai/client'
import { DECOMPOSE_SYSTEM, decomposeTask } from '@/ai/prompts/decompose'
import { DecomposeBulletSchema } from '@/ai/schemas/decompose'
import { deriveMetricStatus, MIN_DECOMPOSE_CHARS, type MetricStatus } from './xyz'

export type Decomposition = {
  x: string
  y: string
  z: string
  metricStatus: MetricStatus
}

export function decomposeLocally(text: string): Decomposition {
  return { x: text.trim(), y: '', z: '', metricStatus: deriveMetricStatus({ text }) }
}

export async function decomposeBullet(input: { userId: string; text: string }): Promise<Decomposition> {
  const text = input.text.trim()
  if (text.length < MIN_DECOMPOSE_CHARS) return decomposeLocally(text)

  const result = await generateStructured({
    route: 'resume.decompose',
    tier: 'fast',
    schema: DecomposeBulletSchema,
    stableSystem: DECOMPOSE_SYSTEM,
    prompt: decomposeTask(text),
    maxTokens: 600,
    userId: input.userId,
  })

  const parts = {
    x: result.data.x?.trim() ?? '',
    y: result.data.y?.trim() ?? '',
    z: result.data.z?.trim() ?? '',
  }

  return { ...parts, metricStatus: deriveMetricStatus({ text, ...parts }) }
}
