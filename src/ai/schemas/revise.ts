import { z } from 'zod'
import { resumeIdSchema } from './resume'

export const ResumeEditSchema = z.object({
  bulletId: resumeIdSchema,
  op: z.enum(['REPLACE_TEXT', 'SET_XYZ', 'DROP', 'ADD_SKILL']),
  text: z.string().max(300).nullable(),
  x: z.string().max(200).nullable(),
  y: z.string().max(200).nullable(),
  z: z.string().max(200).nullable(),
  rationale: z.string().max(300),
})

export const ReviseSchema = z.object({
  edits: z.array(ResumeEditSchema).max(40),
  summary: z
    .object({
      text: z.string().max(600),
      evidenceNodeIds: z.array(z.string().max(40)).max(8),
    })
    .nullable(),
  note: z.string().max(400),
})

export type Revision = z.infer<typeof ReviseSchema>
