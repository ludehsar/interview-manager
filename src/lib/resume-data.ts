import type { ResumeDocument } from '@/ai/schemas/resume'
import { ResumeDocumentSchema } from '@/ai/schemas/resume'
import { guardResume, type GuardReport } from '@/domain/resume/guard'
import { buildEvidencePack } from '@/domain/resume/evidence'
import { latestRun, listResumes, readResume, type RunRow } from '@/domain/resume/store'

export type ResumeListItem = {
  id: string
  kind: 'MASTER' | 'TAILORED'
  title: string
  jobId: string | null
  screenerScore: number | null
  atsScore: number | null
  pdfKey: string | null
  createdAt: Date
  updatedAt: Date
}

export type ResumeDetail = {
  id: string
  kind: 'MASTER' | 'TAILORED'
  title: string
  content: ResumeDocument
  screenerReport: Record<string, unknown> | null
  screenerScore: number | null
  atsReport: Record<string, unknown> | null
  atsScore: number | null
  hasPdf: boolean
  promptVersion: string
  updatedAt: Date
  run: RunRow | null
  guard: GuardReport | null
}

export async function getResumes(userId: string): Promise<{ items: ResumeListItem[]; run: RunRow | null }> {
  const [rows, run] = await Promise.all([listResumes(userId), latestRun(userId)])

  return {
    items: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      jobId: row.jobId,
      screenerScore: row.screenerScore,
      atsScore: row.atsScore,
      pdfKey: row.pdfKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    run,
  }
}

export async function getResumeDetail(userId: string, resumeId: string): Promise<ResumeDetail | null> {
  const row = await readResume(userId, resumeId)
  if (!row) return null

  const parsed = ResumeDocumentSchema.safeParse(row.content)
  const content = parsed.success ? parsed.data : null

  let guard: GuardReport | null = null
  if (content) {
    try {
      guard = guardResume(content, await buildEvidencePack({ userId }))
    } catch {
      guard = null
    }
  }

  const run = await latestRun(userId, resumeId)

  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: content ?? ({ version: 1, basics: { fullName: '', headline: '', location: null, email: null, phone: null, links: [] }, summary: { text: '', evidenceNodeIds: [] }, sections: [] } as ResumeDocument),
    screenerReport: row.screenerReport,
    screenerScore: row.screenerScore,
    atsReport: row.atsReport,
    atsScore: row.atsScore,
    hasPdf: Boolean(row.pdfKey),
    promptVersion: row.promptVersion,
    updatedAt: row.updatedAt,
    run,
    guard,
  }
}
