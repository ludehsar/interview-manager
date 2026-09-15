import { loadSecrets } from '@/aws/ssm'

const WORKER_SECRETS = [
  'DATABASE_URL',
  'ANTHROPIC_API_KEY',
  'CLERK_SECRET_KEY',
  'OPENSEARCH_URL',
  'OPENSEARCH_USERNAME',
  'OPENSEARCH_PASSWORD',
]

export async function ensureSecrets(): Promise<void> {
  await loadSecrets(WORKER_SECRETS)
}
