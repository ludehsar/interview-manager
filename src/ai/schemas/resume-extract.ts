import { z } from 'zod'

export const ExtractedResumeSchema = z.object({
  basics: z.object({
    fullName: z.string().max(120).nullable(),
    headline: z.string().max(160).nullable(),
    location: z.string().max(120).nullable(),
    email: z.string().max(160).nullable(),
    phone: z.string().max(40).nullable(),
    links: z.array(z.object({ label: z.string().max(40), url: z.string().max(240) })).max(8),
  }),
  entries: z
    .array(
      z.object({
        kind: z.enum(['EXPERIENCE', 'PROJECT', 'EDUCATION', 'CERTIFICATION', 'SKILL_GROUP']),
        title: z.string().max(160),
        organization: z.string().max(160).nullable(),
        location: z.string().max(120).nullable(),
        startDate: z.string().max(10).nullable(),
        endDate: z.string().max(10).nullable(),
        isCurrent: z.boolean(),
        summary: z.string().max(600).nullable(),
        skills: z.array(z.string().max(40)).max(25),
        bullets: z
          .array(
            z.object({
              text: z.string().min(10).max(400),
              x: z.string().max(200).nullable(),
              y: z.string().max(200).nullable(),
              z: z.string().max(200).nullable(),
            }),
          )
          .max(12),
      }),
    )
    .max(60),
  warnings: z.array(z.string().max(200)).max(10),
})

export type ExtractedResume = z.infer<typeof ExtractedResumeSchema>
export type ExtractedEntry = ExtractedResume['entries'][number]
