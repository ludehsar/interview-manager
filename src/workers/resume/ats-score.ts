import { atsScoreStep } from '@/domain/resume/steps/ats-score'
import type { PipelineState } from '@/domain/resume/types'
import { ensureSecrets } from '../secrets'
import { pipelineStateSchema } from './state'

export const handler = async (event: unknown): Promise<PipelineState> => {
  await ensureSecrets()
  const { report, ...state } = await atsScoreStep(pipelineStateSchema.parse(event))
  void report
  return state
}
