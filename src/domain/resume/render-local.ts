import { spawn } from 'node:child_process'
import { putObject } from '@/aws/s3'
import type { ResumeDocument } from '@/ai/schemas/resume'

export type RenderOutput = { pdfKey: string; typstKey: string; pageCount: number; bytes: number }

type CliResponse = { page_count: number; bytes: number; pdf_base64: string; source: string }

function runCli(payload: unknown): Promise<CliResponse> {
  const command = process.env.TYPST_CLI_PATH ?? 'target/release/typst-cli'

  return new Promise((resolve, reject) => {
    const child = spawn(command, [], { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => (stdout += String(chunk)))
    child.stderr.on('data', (chunk) => (stderr += String(chunk)))
    child.on('error', (error) =>
      reject(new Error(`could not run ${command}: ${error.message}. Run pnpm crates:local first.`)),
    )
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${command} exited with ${code}: ${stderr.slice(0, 400)}`))
      try {
        resolve(JSON.parse(stdout) as CliResponse)
      } catch {
        reject(new Error(`${command} returned unparseable output`))
      }
    })

    child.stdin.end(JSON.stringify(payload))
  })
}

export async function renderLocally(input: {
  content: ResumeDocument
  pdfKey: string
  typstKey: string
  template?: string
}): Promise<RenderOutput> {
  const result = await runCli({ template: input.template ?? 'ats', content: input.content })
  const pdf = Buffer.from(result.pdf_base64, 'base64')

  await putObject(input.typstKey, result.source, 'text/plain')
  await putObject(input.pdfKey, pdf, 'application/pdf')

  return {
    pdfKey: input.pdfKey,
    typstKey: input.typstKey,
    pageCount: result.page_count,
    bytes: pdf.byteLength,
  }
}
