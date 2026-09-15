import { extractResume } from '@/domain/profile/extract'
import { buildKnowledgeGraph } from '@/domain/profile/kg-build'
import { atsScoreStep } from './steps/ats-score'
import { draftStep } from './steps/draft'
import { guardStep } from './steps/guard'
import { persistStep } from './steps/persist'
import { renderStep } from './steps/render'
import { reviseStep } from './steps/revise'
import { screenStep } from './steps/screen'
import { maxRevisions, targetScore, type PipelineState, type PipelineStep } from './types'

export type PipelineTrace = (step: PipelineStep, detail: Record<string, unknown>) => void

export type PipelineStart = 'extract' | 'draft' | 'screen' | 'render'

const START_ORDER: PipelineStart[] = ['extract', 'draft', 'screen', 'render']

export async function runPipeline(
  initial: PipelineState,
  options: { from?: PipelineStart; trace?: PipelineTrace } = {},
): Promise<PipelineState> {
  const limit = maxRevisions()
  const target = targetScore()
  const trace = options.trace ?? (() => {})
  const from = options.from ?? 'extract'
  const starts = (step: PipelineStart) => START_ORDER.indexOf(from) <= START_ORDER.indexOf(step)
  let state = initial

  try {
    if (starts('extract') && state.uploadId) {
      const extracted = await extractResume({ uploadId: state.uploadId })
      trace('extract', { entries: extracted.entries, bullets: extracted.bullets, warnings: extracted.warnings.length })
    }

    if (starts('extract')) {
      const graph = await buildKnowledgeGraph({ userId: state.userId })
      trace('kg-build', { entries: graph.entries, nodes: graph.nodes, edges: graph.edges, chunks: graph.chunks })
    }

    if (starts('draft')) {
      state = await draftStep(state)
      trace('draft', { resumeId: state.resumeId })
    }

    while (starts('screen')) {
      const { report: guardReport, ...guarded } = await guardStep(state)
      state = guarded
      trace('guard', { ok: guarded.guardOk, errors: guardReport.errors, warnings: guardReport.warnings })
      if (guarded.guardOk) break
      if (state.loop >= limit) throw new Error(`the draft still fails the guard after ${state.loop} revisions`)
      state = await reviseStep(state)
      trace('revise', { loop: state.loop, mode: 'repair' })
    }

    while (starts('screen')) {
      const { report: screener, ...screened } = await screenStep(state)
      state = screened
      trace('screen', { score: screened.screenerScore, verdict: screener.verdict })
      if ((state.screenerScore ?? 0) >= target || state.loop >= limit) break
      state = await reviseStep(state)
      trace('revise', { loop: state.loop, mode: 'screener' })
    }

    state = await renderStep(state)
    trace('render', { pdfKey: state.pdfKey, typstKey: state.typstKey })

    const { report: ats, ...scored } = await atsScoreStep(state)
    state = scored
    trace('ats-score', { score: scored.atsScore, issues: ats.issues.length })

    state = await persistStep(state)
    trace('persist', { screenerScore: state.screenerScore, atsScore: state.atsScore, loop: state.loop })

    return state
  } catch (error) {
    await persistStep({ ...state, failed: true, error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}
