import { z } from 'zod'
import { RESUME_HEADINGS } from './resume'

export const DraftBulletSchema = z.object({
  sourceBulletId: z.string().max(40).nullable(),
  text: z.string().min(40).max(220),
  x: z.string().max(200),
  y: z.string().max(200),
  z: z.string().max(200),
  evidenceNodeIds: z.array(z.string().max(40)).min(1).max(8),
})

export const DraftEntrySchema = z.object({
  entryId: z.string().max(40),
  skills: z.array(z.string().max(40)).max(20),
  bullets: z.array(DraftBulletSchema).max(10),
})

export const DraftSectionSchema = z.object({
  kind: z.enum(['EXPERIENCE', 'PROJECT', 'EDUCATION', 'CERTIFICATION', 'SKILL_GROUP']),
  heading: z.enum(RESUME_HEADINGS),
  entries: z.array(DraftEntrySchema).max(30),
})

export const ResumeDraftSchema = z.object({
  headline: z.string().max(160),
  summary: z.object({
    text: z.string().max(600),
    evidenceNodeIds: z.array(z.string().max(40)).max(8),
  }),
  sections: z.array(DraftSectionSchema).max(8),
})

export type ResumeDraft = z.infer<typeof ResumeDraftSchema>
export type DraftSection = z.infer<typeof DraftSectionSchema>
export type DraftEntry = z.infer<typeof DraftEntrySchema>
export type DraftBullet = z.infer<typeof DraftBulletSchema>
