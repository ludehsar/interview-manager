import { mkdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'

const WORKERS = [
  'ingest/dispatch',
  'ingest/worker',
  'ingest/match',
  'resume/extract',
  'resume/kg-build',
  'resume/draft',
  'resume/guard',
  'resume/screen',
  'resume/revise',
  'resume/ats-score',
  'resume/persist',
]

const OUT_DIR = 'dist/workers'

async function main() {
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const present = WORKERS.filter((name) => existsSync(join('src/workers', `${name}.ts`)))
  if (present.length === 0) {
    console.log('no worker entrypoints yet')
    return
  }

  await Promise.all(
    present.map((name) =>
      build({
        entryPoints: [join('src/workers', `${name}.ts`)],
        outfile: join(OUT_DIR, name.replace('/', '-'), 'index.js'),
        bundle: true,
        platform: 'node',
        target: 'node22',
        format: 'cjs',
        minify: true,
        sourcemap: false,
        external: ['@aws-sdk/*'],
        tsconfig: 'tsconfig.json',
      }),
    ),
  )

  console.log(`bundled ${present.length} workers into ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
