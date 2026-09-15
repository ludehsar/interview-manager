'use server'

import { z } from 'zod'
import type { GapQuestion } from '@/ai/schemas/interview'
import { buildChunks } from '@/domain/profile/chunks'
import { listEntries } from '@/domain/profile/entries'
import { answerGapQuestion, startGapInterview, type AnswerResult } from '@/domain/profile/interview'
import { replaceChunks } from '@/domain/profile/kg'
import { requireUserId } from '@/lib/auth'

const answerSchema = z.object({
  bulletId: z.string().min(1).max(40),
  question: z.string().min(1).max(300),
  answer: z.string().trim().min(2).max(1200),
})

export async function beginInterview(): Promise<GapQuestion[]> {
  const userId = await requireUserId()
  return startGapInterview(userId)
}

export async function submitAnswer(input: {
  bulletId: string
  question: string
  answer: string
}): Promise<AnswerResult> {
  const userId = await requireUserId()
  const result = await answerGapQuestion({ userId, ...answerSchema.parse(input) })

  if (result.grounded) {
    const entries = await listEntries(userId)
    const entry = entries.find((candidate) => candidate.bullets.some((bullet) => bullet.id === result.bulletId))
    if (entry) await replaceChunks(userId, entry.id, buildChunks(entry))
  }

  return result
}
