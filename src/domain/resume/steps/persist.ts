import { advanceRun, failRun, finishRun } from '../store'
import type { PipelineState } from '../types'

export async function persistStep(state: PipelineState & { failed?: boolean; error?: string }): Promise<PipelineState> {
  if (state.failed) {
    await failRun(state.runId, 'persist', state.error ?? 'pipeline failed')
    return state
  }

  await advanceRun(state.runId, 'persist', {
    screenerScore: state.screenerScore,
    atsScore: state.atsScore,
    loop: state.loop,
    guardErrors: state.guardErrors,
  })
  await finishRun(state.runId, state.resumeId)

  return state
}
