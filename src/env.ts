import { z } from 'zod'

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AWS_REGION: z.string().default('ap-southeast-1'),
  AWS_ENDPOINT_URL: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  SSM_PREFIX: z.string().optional(),
  INGEST_QUEUE_URL: z.string().optional(),
  EMBED_QUEUE_URL: z.string().optional(),
  RESUME_STATE_MACHINE_ARN: z.string().optional(),
  EMBED_FUNCTION_ARN: z.string().optional(),
  RENDER_FUNCTION_ARN: z.string().optional(),
  RESUME_TARGET_SCORE: z.coerce.number().int().min(0).max(100).default(85),
  RESUME_MAX_REVISIONS: z.coerce.number().int().min(0).max(5).default(2),
  EMBEDDING_PROVIDER: z
    .enum(['cli', 'lambda', 'stub', 'bedrock', 'local'])
    .default('cli')
    .transform((v) => (v === 'local' ? ('cli' as const) : v)),
  EMBED_CLI_PATH: z.string().default('target/release/embed-cli'),
  TYPST_CLI_PATH: z.string().default('target/release/typst-cli'),
  APP_URL: z.string().default('http://localhost:3000'),
  REVALIDATE_SECRET: z.string().optional(),
  ADAPTER_USER_AGENT: z.string().default('interview-manager/1.0 (+https://github.com)'),
  INGEST_MAX_PAGES: z.coerce.number().int().positive().default(5),
  OPENSEARCH_URL: z.string().optional(),
  OPENSEARCH_INDEX: z.string().default('jobs'),
  OPENSEARCH_USERNAME: z.string().optional(),
  OPENSEARCH_PASSWORD: z.string().optional(),
  OPENSEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  LOCATION_LLM_FALLBACK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

function withoutBlanks(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const cleaned: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(source)) {
    cleaned[key] = value === '' ? undefined : value
  }
  return cleaned
}

export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(withoutBlanks(process.env))
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Invalid server environment: ${missing}`)
  }
  cached = parsed.data
  return cached
}
