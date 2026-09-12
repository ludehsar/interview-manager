export type SearchConfig = {
  url: string
  index: string
  username?: string
  password?: string
  timeoutMs: number
}

export class SearchError extends Error {
  readonly status: number
  readonly body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'SearchError'
    this.status = status
    this.body = body
  }
}

let cached: SearchConfig | null | undefined

export function searchConfig(): SearchConfig | null {
  if (cached !== undefined) return cached
  const url = process.env.OPENSEARCH_URL
  cached = url
    ? {
        url: url.replace(/\/+$/, ''),
        index: process.env.OPENSEARCH_INDEX ?? 'jobs',
        username: process.env.OPENSEARCH_USERNAME || undefined,
        password: process.env.OPENSEARCH_PASSWORD || undefined,
        timeoutMs: Number(process.env.OPENSEARCH_TIMEOUT_MS ?? 5000),
      }
    : null
  return cached
}

export function resetSearchConfig(): void {
  cached = undefined
}

export function isSearchEnabled(): boolean {
  return searchConfig() !== null
}

function authHeader(config: SearchConfig): Record<string, string> {
  if (!config.username || !config.password) return {}
  const token = Buffer.from(`${config.username}:${config.password}`, 'utf8').toString('base64')
  return { authorization: `Basic ${token}` }
}

export async function searchRequest<T>(
  method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD',
  path: string,
  body?: unknown,
  contentType = 'application/json',
): Promise<T> {
  const config = searchConfig()
  if (!config) throw new SearchError('OPENSEARCH_URL is not set', 0, '')

  const payload =
    body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)

  const response = await fetch(`${config.url}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(payload === undefined ? {} : { 'content-type': contentType }),
      ...authHeader(config),
    },
    body: payload,
    signal: AbortSignal.timeout(config.timeoutMs),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new SearchError(`${response.status} from ${path}`, response.status, text.slice(0, 500))
  }

  if (method === 'HEAD' || response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function indexPath(suffix = ''): string {
  const config = searchConfig()
  if (!config) throw new SearchError('OPENSEARCH_URL is not set', 0, '')
  return `/${encodeURIComponent(config.index)}${suffix}`
}
