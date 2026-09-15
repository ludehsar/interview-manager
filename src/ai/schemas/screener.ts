import { z } from 'zod'
import { resumeIdSchema } from './resume'
import { RUBRIC_CRITERIA } from '@/domain/resume/rubric'

export const ScreenerSchema = z.object({
  verdict: z.enum(['STRONG_YES', 'YES', 'MAYBE', 'NO']),
  sixSecondScan: z.object({
    passes: z.boolean(),
    notes: z.string().max(400),
  }),
  rubric: z
    .array(
      z.object({
        criterion: z.enum(RUBRIC_CRITERIA),
        score: z.number().int().min(0).max(100),
        comment: z.string().max(400),
      }),
    )
    .max(12),
  perBullet: z
    .array(
      z.object({
        bulletId: resumeIdSchema,
        score: z.number().int().min(0).max(100),
        issue: z.enum(['NO_OUTCOME', 'NO_NUMBER', 'WEAK_VERB', 'TOO_LONG', 'VAGUE_SCOPE', 'DUPLICATE', 'NONE']),
        comment: z.string().max(400),
      }),
    )
    .max(60),
  redFlags: z
    .array(
      z.object({
        code: z.string().max(40),
        severity: z.enum(['low', 'medium', 'high']),
        detail: z.string().max(400),
      }),
    )
    .max(12),
})

export type Screener = z.infer<typeof ScreenerSchema>
