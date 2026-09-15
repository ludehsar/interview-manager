import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { kgEdges, kgNodes, knowledgeChunks } from '@/db/schema'
import type { KgEdgeType, KgExtraction, KgNodeType } from '@/ai/schemas/kg'
import { newId } from '@/lib/ids'
import { normalizeLabel } from './normalize-label'

export const MAX_LABEL_CHARS = 120

export function boundedLabel(label: string): string {
  return label.trim().slice(0, MAX_LABEL_CHARS)
}

export type NodeInput = {
  type: KgNodeType
  label: string
  props: { value: number | null; unit: string | null; period: string | null; detail: string | null }
  entryId: string | null
}

export type EdgeInput = { sourceId: string; targetId: string; type: KgEdgeType; evidenceEntryId: string | null }

export async function upsertNodes(userId: string, nodes: NodeInput[]): Promise<Map<string, string>> {
  const byKey = new Map<string, string>()
  if (nodes.length === 0) return byKey

  for (const node of nodes) {
    const label = boundedLabel(node.label)
    const normalized = normalizeLabel(label)
    if (normalized === '') continue

    const [row] = await db()
      .insert(kgNodes)
      .values({
        id: newId('kgn'),
        userId,
        type: node.type,
        label,
        normalizedLabel: normalized,
        props: node.props,
        entryId: node.entryId,
      })
      .onConflictDoUpdate({
        target: [kgNodes.userId, kgNodes.type, kgNodes.normalizedLabel],
        set: { label, props: node.props, entryId: node.entryId },
      })
      .returning({ id: kgNodes.id })

    byKey.set(`${node.type}:${normalized}`, row.id)
  }

  return byKey
}

export async function upsertEdges(userId: string, edges: EdgeInput[]): Promise<number> {
  if (edges.length === 0) return 0

  let written = 0
  for (const edge of edges) {
    if (edge.sourceId === edge.targetId) continue
    await db()
      .insert(kgEdges)
      .values({
        id: newId('kge'),
        userId,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.type,
        evidenceEntryId: edge.evidenceEntryId,
      })
      .onConflictDoUpdate({
        target: [kgEdges.sourceId, kgEdges.targetId, kgEdges.type],
        set: { evidenceEntryId: edge.evidenceEntryId },
      })
    written += 1
  }

  return written
}

export async function replaceChunks(
  userId: string,
  entryId: string,
  chunks: { text: string; source: string }[],
): Promise<string[]> {
  await db().delete(knowledgeChunks).where(and(eq(knowledgeChunks.userId, userId), eq(knowledgeChunks.entryId, entryId)))
  if (chunks.length === 0) return []

  const rows = chunks.map((chunk) => ({
    id: newId('knc'),
    userId,
    entryId,
    source: chunk.source,
    text: chunk.text,
  }))

  await db().insert(knowledgeChunks).values(rows)
  return rows.map((row) => row.id)
}

export async function clearEntryGraph(userId: string, entryId: string): Promise<void> {
  await db().delete(kgNodes).where(and(eq(kgNodes.userId, userId), eq(kgNodes.entryId, entryId)))
}

export async function writeChunkEmbeddings(rows: { id: string; embedding: number[] }[]): Promise<number> {
  if (rows.length === 0) return 0

  for (const row of rows) {
    await db()
      .update(knowledgeChunks)
      .set({ embedding: sql`${`[${row.embedding.join(',')}]`}::vector` })
      .where(eq(knowledgeChunks.id, row.id))
  }

  return rows.length
}

export async function writeNodeEmbeddings(rows: { id: string; embedding: number[] }[]): Promise<number> {
  if (rows.length === 0) return 0

  for (const row of rows) {
    await db()
      .update(kgNodes)
      .set({ embedding: sql`${`[${row.embedding.join(',')}]`}::vector` })
      .where(eq(kgNodes.id, row.id))
  }

  return rows.length
}

export async function chunksMissingEmbeddings(userId: string, ids?: string[]): Promise<{ id: string; text: string }[]> {
  const where = ids?.length
    ? and(eq(knowledgeChunks.userId, userId), inArray(knowledgeChunks.id, ids))
    : and(eq(knowledgeChunks.userId, userId), sql`${knowledgeChunks.embedding} is null`)

  return db().select({ id: knowledgeChunks.id, text: knowledgeChunks.text }).from(knowledgeChunks).where(where)
}

export async function nodesMissingEmbeddings(userId: string, ids?: string[]): Promise<{ id: string; text: string }[]> {
  const where = ids?.length
    ? and(eq(kgNodes.userId, userId), inArray(kgNodes.id, ids))
    : and(eq(kgNodes.userId, userId), sql`${kgNodes.embedding} is null`)

  const rows = await db()
    .select({ id: kgNodes.id, label: kgNodes.label, type: kgNodes.type })
    .from(kgNodes)
    .where(where)

  return rows.map((row) => ({ id: row.id, text: `${row.type.toLowerCase()}: ${row.label}` }))
}

export function graphFromExtraction(
  extraction: KgExtraction,
  entryId: string,
): { nodes: NodeInput[]; edges: { source: string; target: string; type: KgEdgeType }[] } {
  const nodes = extraction.nodes
    .filter((node) => normalizeLabel(boundedLabel(node.label)) !== '')
    .map((node) => ({ type: node.type, label: boundedLabel(node.label), props: node.props, entryId }))

  const keyToIdentity = new Map<string, string>()
  for (const node of extraction.nodes) {
    keyToIdentity.set(node.key, `${node.type}:${normalizeLabel(boundedLabel(node.label))}`)
  }

  const edges = extraction.edges
    .map((edge) => ({
      source: keyToIdentity.get(edge.source),
      target: keyToIdentity.get(edge.target),
      type: edge.type,
    }))
    .filter((edge): edge is { source: string; target: string; type: KgEdgeType } =>
      Boolean(edge.source && edge.target && edge.source !== edge.target),
    )

  return { nodes, edges }
}

export async function countKnowledge(userId: string): Promise<{ chunks: number; nodes: number; embedded: number }> {
  const [chunks] = await db()
    .select({
      total: sql<number>`count(*)::int`,
      embedded: sql<number>`count(*) filter (where ${knowledgeChunks.embedding} is not null)::int`,
    })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.userId, userId))

  const [nodes] = await db()
    .select({ total: sql<number>`count(*)::int` })
    .from(kgNodes)
    .where(eq(kgNodes.userId, userId))

  return { chunks: chunks?.total ?? 0, nodes: nodes?.total ?? 0, embedded: chunks?.embedded ?? 0 }
}
