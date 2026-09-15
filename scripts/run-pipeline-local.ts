import { config } from 'dotenv'
import type { PipelineStart } from '@/domain/resume/pipeline'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

type Args = {
  userId: string | null
  uploadId: string | null
  from: string | null
  dry: boolean
  drain: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { userId: null, uploadId: null, from: null, dry: false, drain: false }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === '--user') args.userId = argv[++index] ?? null
    else if (flag === '--upload') args.uploadId = argv[++index] ?? null
    else if (flag === '--from') args.from = argv[++index] ?? null
    else if (flag === '--dry') args.dry = true
    else if (flag === '--drain') args.drain = true
  }

  return args
}

function usd(value: number): string {
  return `$${value.toFixed(4)}`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const { closeDatabase, db } = await import('@/db/client')
  const { sql } = await import('drizzle-orm')

  try {
    if (args.drain) {
      const { extractResume } = await import('@/domain/profile/extract')
      const { db: database } = await import('@/db/client')
      const pending = await database().execute(
        sql`select id from profile_uploads where status = 'EXTRACTING' order by created_at limit 10`,
      )
      const rows = (pending.rows ?? pending) as unknown as { id: string }[]

      if (rows.length === 0) {
        console.log('nothing to drain')
        return
      }

      for (const row of rows) {
        process.stdout.write(`extract ${row.id} ... `)
        const result = await extractResume({ uploadId: row.id })
        console.log(`${result.entries} entries, ${result.bullets} bullets, ${result.warnings.length} warnings`)
      }
      return
    }

    if (!args.userId) {
      console.error('usage: pnpm resume:build --user usr_... [--upload upl_...] [--from draft] [--dry]')
      console.error('       pnpm resume:build --drain')
      process.exit(1)
    }

    const { buildEvidencePack, serializeEvidencePack } = await import('@/domain/resume/evidence')
    const started = Date.now()

    const pack = await buildEvidencePack({ userId: args.userId })
    const serialized = serializeEvidencePack(pack)

    console.log(`evidence  ${pack.entries.length} entries, ${pack.nodes.length} nodes, ${pack.edges.length} edges`)
    console.log(`          ${pack.chunks.length} chunks, ${pack.answers.length} answers`)
    console.log(`          ${serialized.length} chars, ~${Math.round(serialized.length / 4)} tokens`)

    if (args.dry) {
      console.log('')
      console.log(serialized.slice(0, 2000))
      if (serialized.length > 2000) console.log(`\n... ${serialized.length - 2000} more chars`)
      return
    }

    const { targetScore, maxRevisions } = await import('@/domain/resume/types')
    const { runPipeline } = await import('@/domain/resume/pipeline')
    const { initialState, readMasterResume, startRun } = await import('@/domain/resume/store')
    const { PROMPT_VERSION } = await import('@/ai/prompts/version')

    console.log(`settings  target score ${targetScore()}, max revisions ${maxRevisions()}`)

    const from = (args.from ?? 'extract') as PipelineStart
    const master = from === 'extract' || from === 'draft' ? null : await readMasterResume(args.userId)
    if (from !== 'extract' && from !== 'draft' && !master) {
      throw new Error(`--from ${from} needs a master resume that has already been drafted`)
    }

    const runId = await startRun({
      userId: args.userId,
      kind: 'MASTER',
      resumeId: master?.id ?? null,
      step: 'queued',
    })

    const state = {
      ...initialState({
        runId,
        userId: args.userId,
        kind: 'MASTER' as const,
        promptVersion: master?.promptVersion ?? PROMPT_VERSION,
        uploadId: args.uploadId,
      }),
      resumeId: master?.id ?? null,
    }

    console.log(`run       ${runId} from ${from}`)
    console.log('')

    const final = await runPipeline(state, {
      from,
      trace: (step, detail) => {
        const fields = Object.entries(detail)
          .map(([key, value]) => `${key}=${value}`)
          .join(' ')
        console.log(`${step.padEnd(10)}${fields}`)
      },
    })

    console.log('')
    console.log(`resume    ${final.resumeId}`)
    console.log(`scores    screener ${final.screenerScore ?? '—'}, ats ${final.atsScore ?? '—'}, loops ${final.loop}`)
    console.log(`pdf       ${final.pdfKey ?? 'not rendered'}`)

    const spend = await db().execute(
      sql`select coalesce(sum(usd), 0)::float8 as usd from llm_calls where user_id = ${args.userId}`,
    )
    const spendRows = (spend.rows ?? spend) as unknown as { usd: number }[]
    console.log(`spend     ${usd(Number(spendRows[0]?.usd ?? 0))} lifetime for this user`)
    console.log(`elapsed   ${Date.now() - started} ms`)
  } finally {
    await closeDatabase().catch(() => {})
  }
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
