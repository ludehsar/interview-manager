import { GetParametersCommand } from '@aws-sdk/client-ssm'
import { ssmClient } from './clients'

const BATCH_SIZE = 10

let loaded: Promise<void> | null = null

function prefix(): string | null {
  const value = process.env.SSM_PREFIX
  return value ? value.replace(/\/$/, '') : null
}

async function fetchSecrets(names: string[]): Promise<void> {
  const base = prefix()
  if (!base) return

  const missing = names.filter((name) => !process.env[name])
  if (missing.length === 0) return

  for (let index = 0; index < missing.length; index += BATCH_SIZE) {
    const chunk = missing.slice(index, index + BATCH_SIZE)
    const response = await ssmClient().send(
      new GetParametersCommand({ Names: chunk.map((name) => `${base}/${name}`), WithDecryption: true }),
    )
    for (const parameter of response.Parameters ?? []) {
      const name = parameter.Name?.slice(base.length + 1)
      if (name && parameter.Value && !process.env[name]) process.env[name] = parameter.Value
    }
  }
}

export async function loadSecrets(names: string[]): Promise<void> {
  if (!loaded) loaded = fetchSecrets(names)
  await loaded
}

export function resetSecretsCache(): void {
  loaded = null
}
