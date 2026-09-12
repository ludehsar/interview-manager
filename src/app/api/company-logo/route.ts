import { companyHue, companyInitials, isValidDomain } from '@/domain/jobs/company'

const SOURCES = [
  (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
]

const FETCH_TIMEOUT_MS = 6000
const MAX_BYTES = 512 * 1024
const CACHE_HEADER = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'

function monogramResponse(name: string, status = 200): Response {
  const initials = companyInitials(name)
  const hue = companyHue(name)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${initials}">
<rect width="64" height="64" rx="32" fill="oklch(0.95 0.045 ${hue})"/>
<text x="32" y="33" fill="oklch(0.42 0.15 ${hue})" font-family="system-ui, sans-serif" font-size="26" font-weight="600" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`

  return new Response(svg, {
    status,
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': CACHE_HEADER },
  })
}

async function fetchIcon(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
      headers: { accept: 'image/*' },
    })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return null

    const length = Number(response.headers.get('content-length') ?? 0)
    if (length > MAX_BYTES) return null

    const body = await response.arrayBuffer()
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return null

    return new Response(body, {
      status: 200,
      headers: { 'content-type': contentType, 'cache-control': CACHE_HEADER },
    })
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const name = (params.get('name') ?? '').slice(0, 100) || 'Company'
  const domain = (params.get('domain') ?? '').trim().toLowerCase()

  if (!domain || !isValidDomain(domain)) return monogramResponse(name)

  for (const source of SOURCES) {
    const icon = await fetchIcon(source(domain))
    if (icon) return icon
  }

  return monogramResponse(name)
}
