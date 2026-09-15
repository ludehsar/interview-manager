'use server'

import { buildKnowledgeGraph, embedPending } from '@/domain/profile/kg-build'
import { buildChunks } from '@/domain/profile/chunks'
import { listEntries } from '@/domain/profile/entries'
import { replaceChunks } from '@/domain/profile/kg'
import { requireUserId } from '@/lib/auth'

export async function rebuildKnowledge(): Promise<{ entries: number; chunks: number; embedded: number }> {
  const userId = await requireUserId()

  if (process.env.ANTHROPIC_API_KEY) {
    const result = await buildKnowledgeGraph({ userId })
    return { entries: result.entries, chunks: result.chunks, embedded: result.embedded.chunks }
  }

  const entries = await listEntries(userId)
  let chunks = 0
  for (const entry of entries) {
    chunks += (await replaceChunks(userId, entry.id, buildChunks(entry))).length
  }

  const embedded = await embedPending(userId)
  return { entries: entries.length, chunks, embedded: embedded.chunks }
}
