import { z } from 'zod'

export const ingestMessageSchema = z.object({
  v: z.literal(1),
  sourceId: z.string().min(1),
  runId: z.string().min(1),
  requestedAt: z.string(),
})

export type IngestMessage = z.infer<typeof ingestMessageSchema>

export const embedJobsMessageSchema = z.object({
  v: z.literal(1),
  jobIds: z.array(z.string().min(1)).min(1),
})

export const embedTargetsMessageSchema = z.object({
  v: z.literal(2),
  userId: z.string().min(1),
  target: z.enum(['CHUNK', 'KG_NODE']),
  ids: z.array(z.string().min(1)).min(1).max(200),
})

export const embedMessageSchema = z.union([embedJobsMessageSchema, embedTargetsMessageSchema])

export type EmbedJobsMessage = z.infer<typeof embedJobsMessageSchema>
export type EmbedTargetsMessage = z.infer<typeof embedTargetsMessageSchema>
export type EmbedMessage = z.infer<typeof embedMessageSchema>

export const dispatchEventSchema = z.object({
  tier: z.enum(['A', 'B', 'C']).optional(),
  sourceIds: z.array(z.string()).optional(),
  force: z.boolean().optional(),
})

export type DispatchEvent = z.infer<typeof dispatchEventSchema>
