export class HttpError extends Error {
  readonly status: number
  readonly url: string
  readonly bodySnippet: string

  constructor(message: string, options: { status: number; url: string; bodySnippet?: string }) {
    super(message)
    this.name = 'HttpError'
    this.status = options.status
    this.url = options.url
    this.bodySnippet = options.bodySnippet ?? ''
  }
}

export type HttpClient = {
  getJson<T>(url: string, init?: RequestInit): Promise<T>
  getText(url: string, init?: RequestInit): Promise<string>
  postJson<T>(url: string, body: unknown, init?: RequestInit): Promise<T>
}

export type HttpClientOptions = {
  userAgent?: string
  timeoutMs?: number
  retries?: number
  minGapMs?: number
  hostGaps?: Record<string, number>
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(header)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const userAgent = options.userAgent ?? 'interview-manager/1.0'
  const timeoutMs = options.timeoutMs ?? 15000
  const retries = options.retries ?? 3
  const defaultGap = options.minGapMs ?? 500
  const hostGaps = options.hostGaps ?? {}

  const chains = new Map<string, Promise<unknown>>()
  const lastCompleted = new Map<string, number>()

  function gapFor(host: string): number {
    const exact = hostGaps[host]
    if (exact !== undefined) return exact
    for (const [pattern, gap] of Object.entries(hostGaps)) {
      if (host === pattern || host.endsWith(`.${pattern}`)) return gap
    }
    return defaultGap
  }

  async function schedule<T>(url: string, task: () => Promise<T>): Promise<T> {
    const host = hostOf(url)
    const gap = gapFor(host)
    const previous = chains.get(host) ?? Promise.resolve()

    const run = previous.then(async () => {
      const last = lastCompleted.get(host)
      if (last !== undefined) {
        const wait = gap - (Date.now() - last)
        if (wait > 0) await sleep(wait)
      }
      try {
        return await task()
      } finally {
        lastCompleted.set(host, Date.now())
      }
    })

    chains.set(
      host,
      run.then(
        () => undefined,
        () => undefined,
      ),
    )
    return run
  }

  async function request(url: string, init: RequestInit | undefined, accept: string): Promise<Response> {
    let lastError: unknown = null

    for (let attempt = 0; attempt < retries; attempt += 1) {
      if (attempt > 0) {
        await sleep(500 * 3 ** (attempt - 1) + Math.floor(Math.random() * 250))
      }

      try {
        const response = await fetch(url, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
          headers: {
            accept,
            'user-agent': userAgent,
            ...(init?.headers ?? {}),
          },
        })

        if (response.ok) return response

        if (RETRYABLE_STATUS.has(response.status) && attempt < retries - 1) {
          const wait = retryAfterMs(response)
          if (wait !== null) await sleep(Math.min(wait, 30000))
          lastError = new HttpError(`${response.status} from ${url}`, { status: response.status, url })
          continue
        }

        throw new HttpError(`${response.status} from ${url}`, {
          status: response.status,
          url,
          bodySnippet: (await response.text().catch(() => '')).slice(0, 300),
        })
      } catch (error) {
        if (error instanceof HttpError && !RETRYABLE_STATUS.has(error.status)) throw error
        lastError = error
      }
    }

    if (lastError instanceof Error) throw lastError
    throw new HttpError(`request failed: ${url}`, { status: 0, url })
  }

  return {
    async getJson<T>(url: string, init?: RequestInit): Promise<T> {
      const response = await schedule(url, () => request(url, init, 'application/json'))
      return (await response.json()) as T
    },
    async getText(url: string, init?: RequestInit): Promise<string> {
      const response = await schedule(url, () => request(url, init, 'application/xml, text/xml, text/html'))
      return await response.text()
    },
    async postJson<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
      const response = await schedule(url, () =>
        request(
          url,
          {
            ...init,
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
          },
          'application/json',
        ),
      )
      return (await response.json()) as T
    },
  }
}
