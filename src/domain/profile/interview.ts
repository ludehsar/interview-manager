import { and, eq } from 'drizzle-orm'
import { generateStructured } from '@/ai/client'
import { INTERVIEW_SYSTEM, QUANTIFY_SYSTEM, interviewTask, quantifyTask } from '@/ai/prompts/interview'
import { GapQuestionsSchema, QuantifyBulletSchema, type GapQuestion } from '@/ai/schemas/interview'
import { db } from '@/db/client'
import { answerMemory, entryBullets } from '@/db/schema'
import { newId } from '@/lib/ids'
import { findGapBullets, type GapBullet } from './gaps'
import { deriveMetricStatus, type MetricStatus } from './xyz'

export async function startGapInterview(userId: string, limit = 5): Promise<GapQuestion[]> {
  const gaps = await findGapBullets(userId, limit)
  if (gaps.length === 0) return []

  const result = await generateStructured({
    route: 'resume.interview',
    tier: 'write',
    schema: GapQuestionsSchema,
    stableSystem: INTERVIEW_SYSTEM,
    prompt: interviewTask(gaps),
    maxTokens: 2000,
    userId,
  })

  const known = new Set(gaps.map((gap) => gap.bulletId))
  return result.data.questions.filter((question) => known.has(question.bulletId))
}

async function readBullet(userId: string, bulletId: string) {
  const rows = await db()
    .select()
    .from(entryBullets)
    .where(and(eq(entryBullets.id, bulletId), eq(entryBullets.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export type AnswerResult = {
  bulletId: string
  grounded: boolean
  metricStatus: MetricStatus
  text: string
  y: string | null
  z: string | null
  note: string | null
}

export async function answerGapQuestion(input: {
  userId: string
  bulletId: string
  question: string
  answer: string
}): Promise<AnswerResult> {
  const bullet = await readBullet(input.userId, input.bulletId)
  if (!bullet) throw new Error('bullet not found')

  await db().insert(answerMemory).values({
    id: newId('ans'),
    userId: input.userId,
    entryId: bullet.entryId,
    bulletId: bullet.id,
    question: input.question,
    answer: input.answer,
  })

  const result = await generateStructured({
    route: 'resume.quantify',
    tier: 'fast',
    schema: QuantifyBulletSchema,
    stableSystem: QUANTIFY_SYSTEM,
    prompt: quantifyTask({
      text: bullet.text,
      x: bullet.x,
      y: bullet.y,
      z: bullet.z,
      question: input.question,
      answer: input.answer,
    }),
    maxTokens: 1500,
    userId: input.userId,
  })

  const quantified = result.data

  if (!quantified.grounded) {
    const metricStatus = deriveMetricStatus(bullet)
    return {
      bulletId: bullet.id,
      grounded: false,
      metricStatus,
      text: bullet.text,
      y: bullet.y,
      z: bullet.z,
      note: quantified.note,
    }
  }

  const next = {
    text: quantified.text,
    x: quantified.x || bullet.x,
    y: quantified.y || bullet.y,
    z: quantified.z || bullet.z,
  }
  const metricStatus = deriveMetricStatus(next)

  await db()
    .update(entryBullets)
    .set({ text: next.text, x: next.x, y: next.y, z: next.z, metricStatus })
    .where(and(eq(entryBullets.id, bullet.id), eq(entryBullets.userId, input.userId)))

  return {
    bulletId: bullet.id,
    grounded: true,
    metricStatus,
    text: next.text,
    y: next.y,
    z: next.z,
    note: quantified.note,
  }
}

export type { GapBullet }
