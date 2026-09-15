import { generateStructured } from '@/ai/client'
import { embedTexts } from '@/ai/embeddings'
import { KG_BUILD_SYSTEM, kgBuildTask } from '@/ai/prompts/kg-build'
import { KgExtractionSchema } from '@/ai/schemas/kg'
import { buildChunks } from './chunks'
import { listEntries, type EntryWithBullets } from './entries'
import {
  chunksMissingEmbeddings,
  clearEntryGraph,
  graphFromExtraction,
  nodesMissingEmbeddings,
  replaceChunks,
  upsertEdges,
  upsertNodes,
  writeChunkEmbeddings,
  writeNodeEmbeddings,
} from './kg'

export type KgBuildResult = {
  userId: string
  entries: number
  nodes: number
  edges: number
  chunks: number
  embedded: { chunks: number; nodes: number }
  failed: { entryId: string; error: string }[]
}

async function buildEntry(userId: string, entry: EntryWithBullets): Promise<{ nodes: number; edges: number; chunks: number }> {
  const result = await generateStructured({
    route: 'resume.kg-build',
    tier: 'fast',
    schema: KgExtractionSchema,
    stableSystem: KG_BUILD_SYSTEM,
    prompt: kgBuildTask(entry),
    maxTokens: 8000,
    userId,
  })

  const { nodes, edges } = graphFromExtraction(result.data, entry.id)

  await clearEntryGraph(userId, entry.id)
  const byIdentity = await upsertNodes(userId, nodes)

  const resolved = edges
    .map((edge) => ({
      sourceId: byIdentity.get(edge.source),
      targetId: byIdentity.get(edge.target),
      type: edge.type,
      evidenceEntryId: entry.id,
    }))
    .filter((edge): edge is { sourceId: string; targetId: string; type: typeof edge.type; evidenceEntryId: string } =>
      Boolean(edge.sourceId && edge.targetId),
    )

  const edgeCount = await upsertEdges(userId, resolved)

  const modelChunks = result.data.chunks.map((chunk) => ({ text: chunk.text, source: 'model' }))
  const derived = buildChunks(entry)
  const chunkIds = await replaceChunks(userId, entry.id, [...modelChunks, ...derived])

  return { nodes: byIdentity.size, edges: edgeCount, chunks: chunkIds.length }
}

export async function embedPending(userId: string): Promise<{ chunks: number; nodes: number }> {
  const pendingChunks = await chunksMissingEmbeddings(userId)
  const chunkVectors = await embedTexts(pendingChunks.map((row) => row.text))
  const chunks = await writeChunkEmbeddings(
    pendingChunks.map((row, index) => ({ id: row.id, embedding: chunkVectors[index] })),
  )

  const pendingNodes = await nodesMissingEmbeddings(userId)
  const nodeVectors = await embedTexts(pendingNodes.map((row) => row.text))
  const nodes = await writeNodeEmbeddings(
    pendingNodes.map((row, index) => ({ id: row.id, embedding: nodeVectors[index] })),
  )

  return { chunks, nodes }
}

export async function buildKnowledgeGraph(input: { userId: string; entryIds?: string[] }): Promise<KgBuildResult> {
  const all = await listEntries(input.userId)
  const entries = input.entryIds?.length ? all.filter((entry) => input.entryIds?.includes(entry.id)) : all

  let nodes = 0
  let edges = 0
  let chunks = 0
  const failed: { entryId: string; error: string }[] = []

  for (const entry of entries) {
    try {
      const built = await buildEntry(input.userId, entry)
      nodes += built.nodes
      edges += built.edges
      chunks += built.chunks
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failed.push({ entryId: entry.id, error: message })
      console.error(`kg-build failed for entry ${entry.id}: ${message}`)
      await replaceChunks(input.userId, entry.id, buildChunks(entry))
    }
  }

  if (failed.length === entries.length && entries.length > 0) {
    throw new Error(`kg-build failed for all ${entries.length} entries: ${failed[0].error}`)
  }

  const embedded = await embedPending(input.userId)

  return { userId: input.userId, entries: entries.length, nodes, edges, chunks, embedded, failed }
}
