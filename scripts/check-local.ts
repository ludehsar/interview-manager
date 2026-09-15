import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { HeadBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3'
import { GetQueueAttributesCommand } from '@aws-sdk/client-sqs'
import { closeDatabase, db } from '@/db/client'
import { s3Client, sqsClient } from '@/aws/clients'
import { isSearchEnabled, searchConfig, searchRequest } from '@/search/client'
import { indexExists } from '@/search/jobs-index'

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

async function checkSearch(): Promise<Check[]> {
  if (!isSearchEnabled()) return [{ name: 'opensearch', detail: 'OPENSEARCH_URL not set, postgres search in use' }]

  const health = await searchRequest<{ status: string; number_of_nodes: number }>('GET', '/_cluster/health')
  const config = searchConfig()
  const exists = await indexExists()
  const count = exists
    ? await searchRequest<{ count: number }>('GET', `/${config?.index}/_count`).then((result) => result.count)
    : 0

  return [
    { name: 'opensearch', detail: `${health.status} (${health.number_of_nodes} node)` },
    { name: 'jobs index', detail: exists ? `${config?.index} with ${count} documents` : `${config?.index} not created yet` },
  ]
}

async function checkRust(): Promise<Check[]> {
  const run = (command: string, args: string[]) =>
    new Promise<string | null>((resolve) => {
      const child = spawn(command, args)
      let out = ''
      child.stdout.on('data', (chunk) => (out += String(chunk)))
      child.on('error', () => resolve(null))
      child.on('close', (code) => resolve(code === 0 ? out.trim() : null))
    })

  const which = await run('which', ['cargo'])
  if (!which) return [{ name: 'cargo', detail: 'not installed, install rustup from https://rustup.rs' }]

  const homebrew = which.includes('/opt/homebrew/') || which.includes('/usr/local/Cellar/')
  const version = await run('cargo', ['--version'])
  const docker = await run('docker', ['version', '--format', '{{.Server.Arch}}'])
  const cli = existsSync('target/release/embed-cli')
  const model = existsSync('crates/embed/models/bge-small-en-v1.5/model_quantized.onnx')

  return [
    {
      name: 'cargo',
      detail: homebrew
        ? `${version ?? 'unknown'} at ${which} (Homebrew; fine for local builds and tests, but rustup is needed for any host-toolchain cross-compile)`
        : `${version ?? 'unknown'} at ${which}`,
    },
    { name: 'embed model', detail: model ? 'weights present' : 'missing, run: pnpm assets:fetch' },
    { name: 'embed-cli', detail: cli ? 'built' : 'not built, run: pnpm crates:local' },
    {
      name: 'docker arm64',
      detail: docker === 'arm64' ? 'ready for pnpm crates:build' : `server arch ${docker ?? 'unavailable'}`,
    },
  ]
}

async function main() {
  const checks = [
    ...(await checkDatabase()),
    ...(await checkAws()),
    ...(await checkSearch()),
    ...(await checkRust()),
  ]
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
