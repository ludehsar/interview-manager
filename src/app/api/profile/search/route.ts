import { z } from 'zod'
import { searchChunks, searchNodes } from '@/domain/resume/retrieval'
import { requireUserId } from '@/lib/auth'

const bodySchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.number().int().min(1).max(20).optional(),
})

export async function POST(request: Request) {
  const userId = await requireUserId()

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Send { query }' }, { status: 400 })

  const [chunks, nodes] = await Promise.all([
    searchChunks({ userId, query: parsed.data.query, limit: parsed.data.limit ?? 8 }),
    searchNodes({ userId, query: parsed.data.query, limit: 8 }).catch(() => []),
  ])

  return Response.json({ chunks, nodes })
}
