import { z } from 'zod'

export const ENTRY_KINDS = ['EXPERIENCE', 'PROJECT', 'EDUCATION', 'CERTIFICATION', 'SKILL_GROUP'] as const
export const METRIC_STATUSES = ['QUANTIFIED', 'ESTIMATED', 'MISSING'] as const

export const entryKindSchema = z.enum(ENTRY_KINDS)
export type EntryKind = z.infer<typeof entryKindSchema>

const trimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()

export const linkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.string().trim().url().max(240),
})

export const basicsSchema = z.object({
  fullName: trimmed(120),
  headline: trimmed(160),
  location: trimmed(120),
  email: trimmed(160),
  phone: trimmed(40),
  links: z.array(linkSchema).max(8).default([]),
})
export type BasicsInput = z.input<typeof basicsSchema>
export type Basics = z.infer<typeof basicsSchema>

export const preferencesSchema = z.object({
  targetTitles: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  seniority: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  remoteRegions: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  employmentTypes: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  salaryMinUsdMonth: z.coerce.number().int().min(0).max(200000).nullable().default(null),
  excludedCompanies: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
})
export type PreferencesInput = z.input<typeof preferencesSchema>
export type Preferences = z.infer<typeof preferencesSchema>

export const entrySchema = z.object({
  kind: entryKindSchema,
  title: z.string().trim().min(1).max(160),
  organization: trimmed(160),
  location: trimmed(120),
  startDate: trimmed(10),
  endDate: trimmed(10),
  isCurrent: z.boolean().default(false),
  skills: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
  summary: trimmed(600),
})
export type EntryInput = z.input<typeof entrySchema>
export type Entry = z.infer<typeof entrySchema>

export const bulletTextSchema = z.string().trim().min(1).max(400)

export const bulletSchema = z.object({
  entryId: z.string().min(1).max(40),
  text: z.string().trim().min(1).max(400),
  x: trimmed(200),
  y: trimmed(200),
  z: trimmed(200),
})
export type BulletInput = z.input<typeof bulletSchema>
export type Bullet = z.infer<typeof bulletSchema>

export const orderedIdsSchema = z.array(z.string().min(1).max(40)).min(1).max(200)
