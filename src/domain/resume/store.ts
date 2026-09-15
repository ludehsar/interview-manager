import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { resumeRuns, resumes } from '@/db/schema'
import type { ResumeDocument } from '@/ai/schemas/resume'
import { newId } from '@/lib/ids'
import type { PipelineState, ResumeKind } from './types'

export type RunRow = {
  id: string
  userId: string
  resumeId: string | null
  kind: ResumeKind
  jobId: string | null
  executionArn: string | null
  step: string
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  error: string | null
  metrics: Record<string, unknown>
  startedAt: Date
  updatedAt: Date
}

export async function startRun(input: {
  userId: string
  kind: ResumeKind
  jobId?: string | null
  resumeId?: string | null
  step?: string
}): Promise<string> {
  const id = newId('rrn')
  await db().insert(resumeRuns).values({
    id,
    userId: input.userId,
    kind: input.kind,
    jobId: input.jobId ?? null,
    resumeId: input.resumeId ?? null,
    step: input.step ?? 'queued',
  })
  return id
}

export async function advanceRun(runId: string, step: string, metrics?: Record<string, unknown>): Promise<void> {
  await db()
    .update(resumeRuns)
    .set({
      step,
      updatedAt: new Date(),
      ...(metrics ? { metrics: sql`${resumeRuns.metrics} || ${JSON.stringify(metrics)}::jsonb` } : {}),
    })
    .where(eq(resumeRuns.id, runId))
}

export async function failRun(runId: string, step: string, error: string): Promise<void> {
  await db()
    .update(resumeRuns)
    .set({ step, status: 'FAILED', error: error.slice(0, 2000), updatedAt: new Date() })
    .where(eq(resumeRuns.id, runId))
}

export async function finishRun(runId: string, resumeId: string | null): Promise<void> {
  await db()
    .update(resumeRuns)
    .set({ step: 'persist', status: 'SUCCEEDED', resumeId, updatedAt: new Date() })
    .where(eq(resumeRuns.id, runId))
}

export async function attachExecution(runId: string, executionArn: string): Promise<void> {
  await db().update(resumeRuns).set({ executionArn, updatedAt: new Date() }).where(eq(resumeRuns.id, runId))
}

export async function latestRun(userId: string, resumeId?: string): Promise<RunRow | null> {
  const where = resumeId
    ? and(eq(resumeRuns.userId, userId), eq(resumeRuns.resumeId, resumeId))
    : eq(resumeRuns.userId, userId)

  const rows = await db().select().from(resumeRuns).where(where).orderBy(desc(resumeRuns.startedAt)).limit(1)
  return (rows[0] as RunRow | undefined) ?? null
}

export async function upsertMasterResume(input: {
  userId: string
  title: string
  content: ResumeDocument
  promptVersion: string
}): Promise<string> {
  const [row] = await db()
    .insert(resumes)
    .values({
      id: newId('res'),
      userId: input.userId,
      kind: 'MASTER',
      title: input.title,
      content: input.content,
      promptVersion: input.promptVersion,
    })
    .onConflictDoUpdate({
      target: resumes.userId,
      targetWhere: sql`kind = 'MASTER'`,
      set: {
        title: input.title,
        content: input.content,
        promptVersion: input.promptVersion,
        updatedAt: new Date(),
      },
    })
    .returning({ id: resumes.id })

  return row.id
}

export async function saveResumeScores(
  resumeId: string,
  scores: {
    screenerScore?: number | null
    atsScore?: number | null
    screenerReport?: Record<string, unknown> | null
    atsReport?: Record<string, unknown> | null
    pdfKey?: string | null
    typstKey?: string | null
    content?: ResumeDocument
  },
): Promise<void> {
  await db()
    .update(resumes)
    .set({
      ...(scores.screenerScore !== undefined ? { screenerScore: scores.screenerScore } : {}),
      ...(scores.atsScore !== undefined ? { atsScore: scores.atsScore } : {}),
      ...(scores.screenerReport !== undefined ? { screenerReport: scores.screenerReport } : {}),
      ...(scores.atsReport !== undefined ? { atsReport: scores.atsReport } : {}),
      ...(scores.pdfKey !== undefined ? { pdfKey: scores.pdfKey } : {}),
      ...(scores.typstKey !== undefined ? { typstKey: scores.typstKey } : {}),
      ...(scores.content !== undefined ? { content: scores.content } : {}),
      updatedAt: new Date(),
    })
    .where(eq(resumes.id, resumeId))
}

export async function readResume(userId: string, resumeId: string) {
  const rows = await db()
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function readMasterResume(userId: string) {
  const rows = await db()
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.kind, 'MASTER')))
    .limit(1)
  return rows[0] ?? null
}

export async function listResumes(userId: string) {
  return db().select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.createdAt))
}

export function initialState(input: {
  runId: string
  userId: string
  kind: ResumeKind
  promptVersion: string
  jobId?: string | null
  uploadId?: string | null
}): PipelineState {
  return {
    runId: input.runId,
    userId: input.userId,
    kind: input.kind,
    resumeId: null,
    jobId: input.jobId ?? null,
    uploadId: input.uploadId ?? null,
    evidenceKey: null,
    promptVersion: input.promptVersion,
    loop: 0,
    guardOk: false,
    guardErrors: 0,
    screenerScore: null,
    atsScore: null,
    pdfKey: null,
    typstKey: null,
  }
}
