import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const bodySchema = z.object({ tags: z.array(z.string().min(1).max(256)).min(1).max(256) })

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected) return new Response('revalidation is not configured', { status: 503 })

  const provided = request.headers.get('x-revalidate-secret') ?? ''
  if (!secretsMatch(provided, expected)) return new Response('forbidden', { status: 403 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response('invalid body', { status: 400 })

  for (const tag of parsed.data.tags) {
    revalidateTag(tag, 'max')
  }

  return Response.json({ revalidated: parsed.data.tags.length })
}
