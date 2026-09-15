import { reviseStep } from '@/domain/resume/steps/revise'
import type { PipelineState } from '@/domain/resume/types'
import { ensureSecrets } from '../secrets'
import { pipelineStateSchema } from './state'

export const handler = async (event: unknown): Promise<PipelineState> => {
  await ensureSecrets()
  return reviseStep(pipelineStateSchema.parse(event))
}
