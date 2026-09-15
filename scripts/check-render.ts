import { config } from 'dotenv'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

type Args = { userId: string | null; resumeId: string | null; out: string | null }

function parseArgs(argv: string[]): Args {
  const args: Args = { userId: null, resumeId: null, out: null }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === '--user') args.userId = argv[++index] ?? null
    else if (flag === '--resume') args.resumeId = argv[++index] ?? null
    else if (flag === '--out') args.out = argv[++index] ?? null
  }

  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const { ResumeDocumentSchema } = await import('@/ai/schemas/resume')
  const { renderLocally } = await import('@/domain/resume/render-local')
  const { extractPdfText, keywordsFromDocument, scoreAts } = await import('@/domain/resume/ats')
  const { getObjectBytes } = await import('@/aws/s3')
  const { closeDatabase } = await import('@/db/client')

  try {
    let content
    let label: string

    if (args.resumeId) {
      if (!args.userId) throw new Error('--resume needs --user')
      const { readResume } = await import('@/domain/resume/store')
      const row = await readResume(args.userId, args.resumeId)
      if (!row) throw new Error('resume not found')
      content = ResumeDocumentSchema.parse(row.content)
      label = `${row.title} (${row.id})`
    } else {
      const { resumeDocument } = await import('@/domain/resume/__fixtures__/document')
      content = resumeDocument()
      label = 'the built-in fixture'
    }

    const stamp = Date.now()
    const pdfKey = `pdf/check/${stamp}.pdf`
    const typstKey = `typst/check/${stamp}.typ`

    console.log(`rendering ${label}`)
    const output = await renderLocally({ content, pdfKey, typstKey })
    console.log(`pdf       ${output.pageCount} page(s), ${output.bytes} bytes at ${output.pdfKey}`)

    const bytes = await getObjectBytes(output.pdfKey)
    const text = await extractPdfText(bytes)
    const report = scoreAts({ pdfText: text, doc: content, keywords: keywordsFromDocument(content) })

    console.log(`ats       score ${report.score}, ${report.parsedChars} chars parsed back`)
    console.log(`headings  found ${report.headings.found.join(', ') || 'none'}`)
    if (report.headings.missing.length > 0) console.log(`          missing ${report.headings.missing.join(', ')}`)
    console.log(
      `bullets   ${report.bulletRoundTrip.filter((bullet) => bullet.found).length}/${report.bulletRoundTrip.length} survived the text layer`,
    )
    console.log(`keywords  ${Math.round(report.ratio * 100)}% of ${report.coverage.length} covered`)
    for (const issue of report.issues) console.log(`issue     ${issue.code}: ${issue.detail}`)

    if (args.out) {
      const { writeFile } = await import('node:fs/promises')
      await writeFile(args.out, bytes)
      console.log(`wrote     ${args.out}`)
    }
  } finally {
    await closeDatabase().catch(() => {})
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
