import { z } from 'zod'

export const GapQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        bulletId: z.string().max(40),
        question: z.string().max(300),
        why: z.string().max(160),
        expects: z.enum(['NUMBER', 'TIMEFRAME', 'SCALE', 'OUTCOME']),
      }),
    )
    .max(5),
})

export const QuantifyBulletSchema = z.object({
  grounded: z.boolean(),
  x: z.string().max(200),
  y: z.string().max(200),
  z: z.string().max(200),
  text: z.string().min(20).max(300),
  note: z.string().max(160).nullable(),
})

export type GapQuestions = z.infer<typeof GapQuestionsSchema>
export type GapQuestion = GapQuestions['questions'][number]
export type QuantifyBullet = z.infer<typeof QuantifyBulletSchema>
