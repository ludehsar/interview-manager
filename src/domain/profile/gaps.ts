import { sql } from 'drizzle-orm'
import { db } from '@/db/client'

export type GapBullet = {
  bulletId: string
  entryId: string
  entryTitle: string
  organization: string | null
  text: string
  x: string | null
  y: string | null
  z: string | null
  missing: ('Y' | 'Z')[]
}

export const MAX_ANSWERS_PER_BULLET = 2

export function gapBulletsQuery(userId: string, limit: number) {
  return sql`
    select
      b.id as bullet_id,
      b.entry_id,
      e.title as entry_title,
      e.organization,
      b.text,
      b.x,
      b.y,
      b.z
    from entry_bullets b
    join profile_entries e on e.id = b.entry_id and e.user_id = ${userId}
    left join (
      select bullet_id, count(*)::int as answers
      from answer_memory
      where user_id = ${userId} and bullet_id is not null
      group by bullet_id
    ) a on a.bullet_id = b.id
    where b.user_id = ${userId}
      and e.kind in ('EXPERIENCE', 'PROJECT')
      and (b.metric_status = 'MISSING' or b.y is null or b.y = '' or b.z is null or b.z = '')
      and coalesce(a.answers, 0) < ${MAX_ANSWERS_PER_BULLET}
    order by e.sort_order, b.sort_order
    limit ${limit}
  `
}

export async function findGapBullets(userId: string, limit = 5): Promise<GapBullet[]> {
  const result = await db().execute(gapBulletsQuery(userId, limit))
  const rows = (result.rows ?? result) as unknown as {
    bullet_id: string
    entry_id: string
    entry_title: string
    organization: string | null
    text: string
    x: string | null
    y: string | null
    z: string | null
  }[]

  return rows.map((row) => {
    const missing: ('Y' | 'Z')[] = []
    if (!row.y || row.y.trim() === '') missing.push('Y')
    if (!row.z || row.z.trim() === '') missing.push('Z')

    return {
      bulletId: row.bullet_id,
      entryId: row.entry_id,
      entryTitle: row.entry_title,
      organization: row.organization,
      text: row.text,
      x: row.x,
      y: row.y,
      z: row.z,
      missing,
    }
  })
}
