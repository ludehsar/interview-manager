import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from 'dotenv'
import { createHttpClient } from '@/adapters/http'
import { getAdapter, hostGaps } from '@/adapters/registry'
import { SOURCES } from '@/adapters/sources'
import type { AdapterKind, SourceDefinition } from '@/adapters/types'
import { markFailure, markSuccess } from '@/domain/jobs/source-state'
import { closeDatabase } from '@/db/client'

config({ path: '.env' })
config({ path: '.env.local', override: true })

type Options = {
  tier?: SourceDefinition['tier']
  kind?: AdapterKind
  source?: string
  all: boolean
  write: boolean
  saveFixtures: boolean
}

function parseArgs(argv: string[]): Options {
  const options: Options = { all: false, write: false, saveFixtures: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--tier') options.tier = argv[++i] as SourceDefinition['tier']
    else if (arg === '--kind') options.kind = argv[++i] as AdapterKind
    else if (arg === '--source') options.source = argv[++i]
    else if (arg === '--all') options.all = true
    else if (arg === '--write') options.write = true
    else if (arg === '--save-fixtures') options.saveFixtures = true
  }
  return options
}

function selectSources(options: Options): SourceDefinition[] {
  return SOURCES.filter((source) => {
    if (options.source) return source.id === options.source
    if (!options.all && !source.enabled) return false
    if (options.tier && source.tier !== options.tier) return false
    if (options.kind && source.kind !== options.kind) return false
    return true
  })
}

function saveFixture(kind: AdapterKind, payload: unknown[]): void {
  const dir = join('src', 'adapters', '__fixtures__')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${kind}.json`), `${JSON.stringify(payload.slice(0, 3), null, 2)}\n`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const sources = selectSources(options)
  if (sources.length === 0) {
    console.log('no sources matched')
    return
  }

  const http = createHttpClient({
    userAgent: process.env.ADAPTER_USER_AGENT ?? 'interview-manager/1.0',
    hostGaps: hostGaps(),
    retries: 2,
  })

  let failures = 0
  let tierAFailures = 0
  const savedKinds = new Set<AdapterKind>()

  for (const source of sources) {
    const adapter = getAdapter(source.kind)
    try {
      const payload = await adapter.fetchRaw(source, { http, now: new Date(), maxPages: 1 })
      const parsed = adapter.parse(payload, source)
      const sample = parsed[0]?.title ?? ''
      console.log(
        `ok   ${source.id.padEnd(34)} ${String(parsed.length).padStart(4)} jobs  ${sample ? `"${sample}"` : ''}`,
      )
      if (options.saveFixtures && parsed.length > 0 && !savedKinds.has(source.kind)) {
        saveFixture(source.kind, payload)
        savedKinds.add(source.kind)
      }
      if (options.write) await markSuccess(source.id, parsed.length)
    } catch (error) {
      failures += 1
      if (source.tier === 'A' && source.enabled) tierAFailures += 1
      const message = error instanceof Error ? error.message : String(error)
      console.log(`FAIL ${source.id.padEnd(34)} ${message}`)
      if (options.write) await markFailure(source.id, error)
    }
  }

  console.log(`\n${sources.length - failures}/${sources.length} sources reachable`)
  await closeDatabase()
  if (tierAFailures > 0) process.exitCode = 1
}

main().catch(async (error) => {
  console.error(error)
  await closeDatabase()
  process.exit(1)
})
