import { draftStep } from '@/domain/resume/steps/draft'
import type { PipelineState } from '@/domain/resume/types'
import { ensureSecrets } from '../secrets'
import { pipelineStateSchema } from './state'

export const handler = async (event: unknown): Promise<PipelineState> => {
  await ensureSecrets()
  return draftStep(pipelineStateSchema.parse(event))
}
