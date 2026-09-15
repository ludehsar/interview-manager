import { spawn } from 'node:child_process'

export async function embedViaCli(texts: string[]): Promise<number[][]> {
  const command = process.env.EMBED_CLI_PATH ?? 'target/release/embed-cli'

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
        resolve((JSON.parse(stdout) as { vectors: number[][] }).vectors)
      } catch {
        reject(new Error(`${command} returned unparseable output`))
      }
    })

    child.stdin.end(JSON.stringify({ texts }))
  })
}
