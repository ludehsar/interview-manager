import type { ResumeDocument } from '@/ai/schemas/resume'
import { applyEdits, type ResumeEdit } from './edits'
import type { EvidencePack } from './evidence'
import { guardResume } from './guard'

export type SafeEditResult = {
  doc: ResumeDocument
  applied: ResumeEdit[]
  rejected: ResumeEdit[]
}

export function applySafeEdits(doc: ResumeDocument, edits: ResumeEdit[], pack: EvidencePack): SafeEditResult {
  if (edits.length === 0) return { doc, applied: [], rejected: [] }

  const baseline = guardResume(doc, pack).errors
  const together = applyEdits(doc, edits)
  if (guardResume(together, pack).errors <= baseline) {
    return { doc: together, applied: edits, rejected: [] }
  }

  let current = doc
  let errors = baseline
  const applied: ResumeEdit[] = []
  const rejected: ResumeEdit[] = []

  for (const edit of edits) {
    const candidate = applyEdits(current, [edit])
    const next = guardResume(candidate, pack).errors
    if (next <= errors) {
      current = candidate
      errors = next
      applied.push(edit)
    } else {
      rejected.push(edit)
    }
  }

  return { doc: current, applied, rejected }
}

export function withSummary(
  doc: ResumeDocument,
  summary: { text: string; evidenceNodeIds: string[] } | null,
  pack: EvidencePack,
): ResumeDocument {
  if (!summary) return doc

  const candidate: ResumeDocument = { ...doc, summary: { text: summary.text, evidenceNodeIds: summary.evidenceNodeIds } }
  return guardResume(candidate, pack).errors <= guardResume(doc, pack).errors ? candidate : doc
}
