import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { embedTexts, toVectorLiteral } from '@/ai/embeddings'

const RRF_K = 60
const CANDIDATES = 40

export type ChunkHit = { id: string; entryId: string | null; source: string; text: string; score: number }

export function hybridChunkQuery(input: { userId: string; query: string; vector: number[] | null; limit: number }) {
  const vectorCte = input.vector
    ? sql`
      vec as (
        select id, row_number() over (order by embedding <=> ${toVectorLiteral(input.vector)}::vector) as rnk
        from knowledge_chunks
        where user_id = ${input.userId} and embedding is not null
        order by embedding <=> ${toVectorLiteral(input.vector)}::vector
        limit ${CANDIDATES}
      ),`
    : sql`vec as (select null::text as id, 1 as rnk where false),`

  return sql`
    with ${vectorCte}
    fts as (
      select id, row_number() over (
        order by ts_rank_cd(to_tsvector('english', text), websearch_to_tsquery('english', ${input.query})) desc
      ) as rnk
      from knowledge_chunks
      where user_id = ${input.userId}
        and to_tsvector('english', text) @@ websearch_to_tsquery('english', ${input.query})
      limit ${CANDIDATES}
    ),
    fused as (
      select id, sum(1.0 / (${RRF_K} + rnk)) as score
      from (select id, rnk from vec union all select id, rnk from fts) ranked
      where id is not null
      group by id
    )
    select c.id, c.entry_id, c.source, c.text, f.score::float8 as score
    from fused f
    join knowledge_chunks c on c.id = f.id
    order by f.score desc
    limit ${input.limit}
  `
}

export async function searchChunks(input: { userId: string; query: string; limit?: number }): Promise<ChunkHit[]> {
  const limit = input.limit ?? 10

  let vector: number[] | null = null
  try {
    const vectors = await embedTexts([input.query])
    vector = vectors[0] ?? null
  } catch (error) {
    console.warn('vector search unavailable, falling back to full text', error)
  }

  const result = await db().execute(hybridChunkQuery({ userId: input.userId, query: input.query, vector, limit }))
  const rows = (result.rows ?? result) as unknown as {
    id: string
    entry_id: string | null
    source: string
    text: string
    score: number
  }[]

  return rows.map((row) => ({
    id: row.id,
    entryId: row.entry_id,
    source: row.source,
    text: row.text,
    score: Number(row.score),
  }))
}

export function expandOneHopQuery(userId: string, seedIds: string[]) {
  return sql`
    with recursive undirected(from_id, to_id) as (
      select e.source_id, e.target_id from kg_edges e where e.user_id = ${userId}
      union all
      select e.target_id, e.source_id from kg_edges e where e.user_id = ${userId}
    ),
    walk(id, depth) as (
      select id, 0 from kg_nodes where user_id = ${userId} and id = any(${sql.param(seedIds)}::text[])
      union
      select e.to_id, w.depth + 1 from undirected e join walk w on e.from_id = w.id
        where w.depth < 1
    )
    select distinct id from walk
  `
}

export async function expandOneHop(userId: string, seedIds: string[]): Promise<string[]> {
  if (seedIds.length === 0) return []
  const result = await db().execute(expandOneHopQuery(userId, seedIds))
  const rows = (result.rows ?? result) as unknown as { id: string }[]
  return rows.map((row) => row.id)
}

export function nodeVectorQuery(userId: string, vector: number[], limit: number) {
  return sql`
    select id, type, label, (embedding <=> ${toVectorLiteral(vector)}::vector)::float8 as distance
    from kg_nodes
    where user_id = ${userId} and embedding is not null
    order by embedding <=> ${toVectorLiteral(vector)}::vector
    limit ${limit}
  `
}

export async function searchNodes(input: {
  userId: string
  query: string
  limit?: number
}): Promise<{ id: string; type: string; label: string; distance: number }[]> {
  const vectors = await embedTexts([input.query])
  if (!vectors[0]) return []

  const result = await db().execute(nodeVectorQuery(input.userId, vectors[0], input.limit ?? 10))
  const rows = (result.rows ?? result) as unknown as {
    id: string
    type: string
    label: string
    distance: number
  }[]
  return rows.map((row) => ({ ...row, distance: Number(row.distance) }))
}
