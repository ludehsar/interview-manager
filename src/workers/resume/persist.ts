import { z } from 'zod'
import { persistStep } from '@/domain/resume/steps/persist'
import type { PipelineState } from '@/domain/resume/types'
import { ensureSecrets } from '../secrets'
import { pipelineStateSchema } from './state'

const eventSchema = pipelineStateSchema.extend({
  failed: z.boolean().optional(),
  error: z.string().optional(),
})

export const handler = async (event: unknown): Promise<PipelineState> => {
  await ensureSecrets()
  return persistStep(eventSchema.parse(event))
}
