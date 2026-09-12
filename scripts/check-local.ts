import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { HeadBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3'
import { GetQueueAttributesCommand } from '@aws-sdk/client-sqs'
import { closeDatabase, db } from '@/db/client'
import { s3Client, sqsClient } from '@/aws/clients'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

type Check = { name: string; detail: string }

async function checkDatabase(): Promise<Check[]> {
  const version = await db().execute(sql`select version() as version`)
  const tables = await db().execute(
    sql`select count(*)::int as count from information_schema.tables where table_schema = 'public'`,
  )
  const extensions = await db().execute(
    sql`select string_agg(extname, ', ' order by extname) as names from pg_extension where extname in ('vector', 'pg_trgm')`,
  )
  const vectorProbe = await db().execute(
    sql`select ('[1,0,0]'::vector <=> '[0,1,0]'::vector)::float8 as distance`,
  )
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows[0]

  return [
    { name: 'postgres', detail: String(rows(version).version).split(' ').slice(0, 2).join(' ') },
    { name: 'tables', detail: `${rows(tables).count} in public` },
    { name: 'extensions', detail: String(rows(extensions).names ?? 'none') },
    { name: 'pgvector cosine', detail: `distance ${rows(vectorProbe).distance}` },
  ]
}

async function checkAws(): Promise<Check[]> {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error('S3_BUCKET is not set')

  await s3Client().send(new HeadBucketCommand({ Bucket: bucket }))
  const buckets = await s3Client().send(new ListBucketsCommand({}))

  const checks: Check[] = [
    { name: 's3', detail: `${bucket} reachable (${buckets.Buckets?.length ?? 0} buckets)` },
  ]

  for (const [label, url] of [
    ['ingest', process.env.INGEST_QUEUE_URL],
    ['embed', process.env.EMBED_QUEUE_URL],
  ] as const) {
    if (!url) continue
    const attrs = await sqsClient().send(
      new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['QueueArn', 'RedrivePolicy'] }),
    )
    const hasDlq = Boolean(attrs.Attributes?.RedrivePolicy)
    checks.push({ name: `sqs ${label}`, detail: `${attrs.Attributes?.QueueArn} dlq=${hasDlq}` })
  }

  return checks
}

async function main() {
  const checks = [...(await checkDatabase()), ...(await checkAws())]
  for (const check of checks) {
    console.log(`ok  ${check.name.padEnd(16)} ${check.detail}`)
  }
  await closeDatabase()
}

main().catch(async (err) => {
  await closeDatabase().catch(() => {})
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
