import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { answerMemory, kgEdges, kgNodes, knowledgeChunks } from '@/db/schema'
import { listEntries } from '@/domain/profile/entries'
import { readProfile } from '@/domain/profile/profile'
import type { EntryKind } from '@/domain/profile/schema'
import type { MetricStatus } from '@/domain/profile/xyz'
import { expandOneHop, searchChunks } from './retrieval'

export type EvidenceNode = {
  id: string
  type: string
  label: string
  props: { value: number | null; unit: string | null; period: string | null; detail: string | null }
}

export type EvidenceEdge = { sourceId: string; type: string; targetId: string }

export type EvidenceEntry = {
  id: string
  kind: EntryKind
  title: string
  organization: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
  skills: string[]
  summary: string | null
  bullets: {
    id: string
    text: string
    x: string | null
    y: string | null
    z: string | null
    metricStatus: MetricStatus
  }[]
}

export type EvidencePack = {
  version: 1
  basics: {
    fullName: string | null
    headline: string | null
    location: string | null
    email: string | null
    phone: string | null
    links: { label: string; url: string }[]
  }
  entries: EvidenceEntry[]
  nodes: EvidenceNode[]
  edges: EvidenceEdge[]
  chunks: { id: string; source: string; text: string }[]
  answers: { id: string; entryId: string | null; bulletId: string | null; question: string; answer: string }[]
}

const byId = <T extends { id: string }>(rows: T[]): T[] => [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

export async function buildEvidencePack(input: {
  userId: string
  query?: string | null
  k?: number
}): Promise<EvidencePack> {
  const { userId } = input
  const [profile, entries, answers] = await Promise.all([
    readProfile(userId),
    listEntries(userId),
    db().select().from(answerMemory).where(eq(answerMemory.userId, userId)).orderBy(asc(answerMemory.id)),
  ])

  let chunkRows = await db()
    .select({ id: knowledgeChunks.id, source: knowledgeChunks.source, text: knowledgeChunks.text })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.userId, userId))
    .orderBy(asc(knowledgeChunks.id))

  let nodeRows = await db()
    .select()
    .from(kgNodes)
    .where(eq(kgNodes.userId, userId))
    .orderBy(asc(kgNodes.id))

  if (input.query) {
    const hits = await searchChunks({ userId, query: input.query, limit: input.k ?? 20 })
    const keep = new Set(hits.map((hit) => hit.id))
    if (keep.size > 0) chunkRows = chunkRows.filter((row) => keep.has(row.id))

    const seeds = nodeRows.filter((node) => node.entryId && hits.some((hit) => hit.entryId === node.entryId))
    const expanded = await expandOneHop(
      userId,
      seeds.map((node) => node.id),
    )
    if (expanded.length > 0) {
      const keepNodes = new Set(expanded)
      nodeRows = nodeRows.filter((node) => keepNodes.has(node.id))
    }
  }

  const nodeIds = nodeRows.map((node) => node.id)
  const edgeRows =
    nodeIds.length > 0
      ? await db()
          .select()
          .from(kgEdges)
          .where(and(eq(kgEdges.userId, userId), inArray(kgEdges.sourceId, nodeIds)))
          .orderBy(asc(kgEdges.id))
      : []

  const keepNodes = new Set(nodeIds)

  return {
    version: 1,
    basics: {
      fullName: profile?.fullName ?? null,
      headline: profile?.headline ?? null,
      location: profile?.location ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      links: profile?.links ?? [],
    },
    entries: byId(
      entries.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        title: entry.title,
        organization: entry.organization,
        location: entry.location,
        startDate: entry.startDate,
        endDate: entry.endDate,
        isCurrent: entry.isCurrent,
        skills: [...entry.skills].sort(),
        summary: entry.summary,
        bullets: byId(
          entry.bullets.map((bullet) => ({
            id: bullet.id,
            text: bullet.text,
            x: bullet.x,
            y: bullet.y,
            z: bullet.z,
            metricStatus: bullet.metricStatus,
          })),
        ),
      })),
    ),
    nodes: byId(
      nodeRows.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        props: {
          value: typeof node.props?.value === 'number' ? node.props.value : null,
          unit: typeof node.props?.unit === 'string' ? node.props.unit : null,
          period: typeof node.props?.period === 'string' ? node.props.period : null,
          detail: typeof node.props?.detail === 'string' ? node.props.detail : null,
        },
      })),
    ),
    edges: edgeRows
      .filter((edge) => keepNodes.has(edge.targetId))
      .map((edge) => ({ sourceId: edge.sourceId, type: edge.type, targetId: edge.targetId })),
    chunks: byId(chunkRows),
    answers: byId(
      answers.map((row) => ({
        id: row.id,
        entryId: row.entryId,
        bulletId: row.bulletId,
        question: row.question,
        answer: row.answer,
      })),
    ),
  }
}

function line(parts: (string | null)[]): string {
  return parts.map((part) => part ?? '').join(' | ')
}

export function serializeEvidencePack(input: EvidencePack): string {
  const pack: EvidencePack = {
    ...input,
    entries: byId(input.entries).map((entry) => ({
      ...entry,
      skills: [...entry.skills].sort(),
      bullets: byId(entry.bullets),
    })),
    nodes: byId(input.nodes),
    edges: [...input.edges].sort((a, b) =>
      `${a.sourceId}${a.type}${a.targetId}` < `${b.sourceId}${b.type}${b.targetId}` ? -1 : 1,
    ),
    chunks: byId(input.chunks),
    answers: byId(input.answers),
  }

  const out: string[] = []

  out.push('## BASICS')
  out.push(line([pack.basics.fullName, pack.basics.headline, pack.basics.location]))
  out.push(line([pack.basics.email, pack.basics.phone]))
  for (const link of pack.basics.links) out.push(`${link.label}: ${link.url}`)

  out.push('')
  out.push('## ENTRIES')
  for (const entry of pack.entries) {
    const period = entry.isCurrent ? `${entry.startDate ?? ''} to Present` : `${entry.startDate ?? ''} to ${entry.endDate ?? ''}`
    out.push(line([entry.id, entry.kind, entry.title, entry.organization, entry.location, period]))
    if (entry.skills.length > 0) out.push(`  skills: ${entry.skills.join(', ')}`)
    if (entry.summary) out.push(`  summary: ${entry.summary}`)
    for (const bullet of entry.bullets) {
      out.push(`  ${bullet.id} | ${bullet.metricStatus} | ${bullet.text}`)
      out.push(`    x: ${bullet.x ?? ''} | y: ${bullet.y ?? ''} | z: ${bullet.z ?? ''}`)
    }
  }

  out.push('')
  out.push('## GRAPH NODES')
  for (const node of pack.nodes) {
    const measure = [node.props.value ?? '', node.props.unit ?? '', node.props.period ?? ''].join(' ').trim()
    out.push(line([node.id, node.type, node.label, measure, node.props.detail]))
  }

  out.push('')
  out.push('## GRAPH EDGES')
  for (const edge of pack.edges) out.push(`${edge.sourceId} -${edge.type}-> ${edge.targetId}`)

  out.push('')
  out.push('## CHUNKS')
  for (const chunk of pack.chunks) {
    out.push(`${chunk.id} | ${chunk.source}`)
    out.push(chunk.text)
  }

  out.push('')
  out.push('## ANSWER MEMORY')
  for (const answer of pack.answers) {
    out.push(`${answer.id} | ${answer.bulletId ?? ''}`)
    out.push(`Q: ${answer.question}`)
    out.push(`A: ${answer.answer}`)
  }

  return out.join('\n')
}
