import { z } from 'zod'

export const RESUME_HEADINGS = ['EXPERIENCE', 'PROJECTS', 'EDUCATION', 'CERTIFICATIONS', 'SKILLS'] as const

export const RESUME_ID_MAX = 64

export const resumeIdSchema = z.string().max(RESUME_ID_MAX)

export const ResumeBulletSchema = z.object({
  id: resumeIdSchema,
  sourceBulletId: z.string().max(40).nullable(),
  text: z.string().min(40).max(300),
  x: z.string().max(200),
  y: z.string().max(200),
  z: z.string().max(200),
  metricStatus: z.enum(['QUANTIFIED', 'ESTIMATED', 'MISSING']),
  evidenceNodeIds: z.array(z.string().max(40)).min(1).max(8),
  hidden: z.boolean(),
})

export const ResumeEntrySchema = z.object({
  id: resumeIdSchema,
  entryId: z.string().max(40),
  title: z.string().max(160),
  organization: z.string().max(160).nullable(),
  location: z.string().max(120).nullable(),
  startDate: z.string().max(10).nullable(),
  endDate: z.string().max(10).nullable(),
  isCurrent: z.boolean(),
  skills: z.array(z.string().max(40)).max(20),
  hidden: z.boolean(),
  bullets: z.array(ResumeBulletSchema).max(10),
})

export const ResumeSectionSchema = z.object({
  id: resumeIdSchema,
  kind: z.enum(['EXPERIENCE', 'PROJECT', 'EDUCATION', 'CERTIFICATION', 'SKILL_GROUP']),
  heading: z.enum(RESUME_HEADINGS),
  hidden: z.boolean(),
  entries: z.array(ResumeEntrySchema).max(30),
})

export const ResumeDocumentSchema = z.object({
  version: z.literal(1),
  basics: z.object({
    fullName: z.string().max(120),
    headline: z.string().max(160),
    location: z.string().max(120).nullable(),
    email: z.string().max(160).nullable(),
    phone: z.string().max(40).nullable(),
    links: z.array(z.object({ label: z.string().max(40), url: z.string().max(240) })).max(6),
  }),
  summary: z.object({
    text: z.string().max(600),
    evidenceNodeIds: z.array(z.string().max(40)).max(8),
  }),
  sections: z.array(ResumeSectionSchema).max(8),
})

export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>
export type ResumeSection = z.infer<typeof ResumeSectionSchema>
export type ResumeEntry = z.infer<typeof ResumeEntrySchema>
export type ResumeBullet = z.infer<typeof ResumeBulletSchema>

export function visibleEntries(doc: ResumeDocument): ResumeEntry[] {
  return doc.sections.filter((section) => !section.hidden).flatMap((section) => section.entries.filter((entry) => !entry.hidden))
}

export function visibleBullets(doc: ResumeDocument): { entry: ResumeEntry; bullet: ResumeBullet }[] {
  return visibleEntries(doc).flatMap((entry) =>
    entry.bullets.filter((bullet) => !bullet.hidden).map((bullet) => ({ entry, bullet })),
  )
}

export function allBullets(doc: ResumeDocument): { entry: ResumeEntry; bullet: ResumeBullet }[] {
  return doc.sections.flatMap((section) =>
    section.entries.flatMap((entry) => entry.bullets.map((bullet) => ({ entry, bullet }))),
  )
}
