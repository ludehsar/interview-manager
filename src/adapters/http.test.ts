import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHttpClient, HttpError } from './http'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('createHttpClient', () => {
  it('sends the configured user agent', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ ok: true }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const client = createHttpClient({ userAgent: 'probe/2.0', minGapMs: 0 })
    await client.getJson('https://example.com/a')

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['user-agent']).toBe('probe/2.0')
  })

  it('spaces out requests to the same host', async () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const sleeps: number[] = []
    vi.stubGlobal('setTimeout', ((fn: () => void, ms?: number) => {
      sleeps.push(ms ?? 0)
      now += ms ?? 0
      fn()
      return 0 as unknown as NodeJS.Timeout
    }) as unknown as typeof setTimeout)

    globalThis.fetch = vi.fn(async () => jsonResponse({ ok: true })) as unknown as typeof fetch

    const client = createHttpClient({ minGapMs: 500 })
    await client.getJson('https://example.com/a')
    await client.getJson('https://example.com/b')

    expect(sleeps).toContain(500)
  })

  it('retries a 429 and then succeeds', async () => {
    vi.stubGlobal('setTimeout', ((fn: () => void) => {
      fn()
      return 0 as unknown as NodeJS.Timeout
    }) as unknown as typeof setTimeout)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('slow down', { status: 429, headers: { 'retry-after': '1' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const client = createHttpClient({ minGapMs: 0, retries: 3 })
    await expect(client.getJson('https://example.com/a')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws a typed error on 404 without retrying', async () => {
    const fetchMock = vi.fn(async () => new Response('missing', { status: 404 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const client = createHttpClient({ minGapMs: 0, retries: 3 })
    await expect(client.getJson('https://example.com/missing')).rejects.toBeInstanceOf(HttpError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('host gap matching', () => {
  it('applies a declared gap to subdomains of that host', async () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const sleeps: number[] = []
    vi.stubGlobal('setTimeout', ((fn: () => void, ms?: number) => {
      sleeps.push(ms ?? 0)
      now += ms ?? 0
      fn()
      return 0 as unknown as NodeJS.Timeout
    }) as unknown as typeof setTimeout)

    globalThis.fetch = vi.fn(async () => jsonResponse({ ok: true })) as unknown as typeof fetch

    const client = createHttpClient({ minGapMs: 10, hostGaps: { 'myworkdayjobs.com': 1200 } })
    await client.getJson('https://nvidia.wd5.myworkdayjobs.com/a')
    await client.getJson('https://nvidia.wd5.myworkdayjobs.com/b')

    expect(sleeps).toContain(1200)
  })
})
