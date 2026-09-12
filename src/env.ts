import { z } from 'zod'

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AWS_REGION: z.string().default('ap-southeast-1'),
  AWS_ENDPOINT_URL: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  INGEST_QUEUE_URL: z.string().optional(),
  EMBED_QUEUE_URL: z.string().optional(),
  RESUME_STATE_MACHINE_ARN: z.string().optional(),
  EMBEDDING_PROVIDER: z.enum(['local', 'bedrock']).default('local'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Invalid server environment: ${missing}`)
  }
  cached = parsed.data
  return cached
}
