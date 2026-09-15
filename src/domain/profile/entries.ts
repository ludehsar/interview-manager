import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { entryBullets, profileEntries } from '@/db/schema'
import { newId } from '@/lib/ids'
import type { Bullet, Entry, EntryKind } from './schema'
import { deriveMetricStatus, normalizeDateRange, type MetricStatus } from './xyz'

export type EntryBulletRow = {
  id: string
  entryId: string
  text: string
  x: string | null
  y: string | null
  z: string | null
  metricStatus: MetricStatus
  sortOrder: number
}

export type EntryRow = {
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
  sortOrder: number
}

export type EntryWithBullets = EntryRow & { bullets: EntryBulletRow[] }

function entryData(input: Pick<Entry, 'skills' | 'summary'>): Record<string, unknown> {
  return { skills: input.skills ?? [], summary: input.summary ?? null }
}

function readData(data: Record<string, unknown>): { skills: string[]; summary: string | null } {
  const skills = Array.isArray(data.skills) ? data.skills.filter((value): value is string => typeof value === 'string') : []
  const summary = typeof data.summary === 'string' ? data.summary : null
  return { skills, summary }
}

export async function listEntries(userId: string): Promise<EntryWithBullets[]> {
  const rows = await db()
    .select()
    .from(profileEntries)
    .where(eq(profileEntries.userId, userId))
    .orderBy(asc(profileEntries.kind), asc(profileEntries.sortOrder), asc(profileEntries.createdAt))

  if (rows.length === 0) return []

  const bullets = await db()
    .select()
    .from(entryBullets)
    .where(
      inArray(
        entryBullets.entryId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(entryBullets.sortOrder))

  const byEntry = new Map<string, EntryBulletRow[]>()
  for (const bullet of bullets) {
    const list = byEntry.get(bullet.entryId) ?? []
    list.push({
      id: bullet.id,
      entryId: bullet.entryId,
      text: bullet.text,
      x: bullet.x,
      y: bullet.y,
      z: bullet.z,
      metricStatus: bullet.metricStatus,
      sortOrder: bullet.sortOrder,
    })
    byEntry.set(bullet.entryId, list)
  }

  return rows.map((row) => {
    const data = readData(row.data)
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      organization: row.organization,
      location: row.location,
      startDate: row.startDate,
      endDate: row.endDate,
      isCurrent: row.isCurrent,
      skills: data.skills,
      summary: data.summary,
      sortOrder: row.sortOrder,
      bullets: byEntry.get(row.id) ?? [],
    }
  })
}

async function nextSortOrder(userId: string, kind: EntryKind): Promise<number> {
  const rows = await db()
    .select({ next: sql<number>`coalesce(max(${profileEntries.sortOrder}), -1) + 1` })
    .from(profileEntries)
    .where(and(eq(profileEntries.userId, userId), eq(profileEntries.kind, kind)))
  return rows[0]?.next ?? 0
}

export async function insertEntry(userId: string, input: Entry): Promise<string> {
  const id = newId('ent')
  const range = normalizeDateRange(input)

  await db()
    .insert(profileEntries)
    .values({
      id,
      userId,
      kind: input.kind,
      title: input.title,
      organization: input.organization,
      location: input.location,
      startDate: range.startDate,
      endDate: range.endDate,
      isCurrent: range.isCurrent,
      data: entryData(input),
      sortOrder: await nextSortOrder(userId, input.kind),
    })

  return id
}

export async function updateEntry(userId: string, id: string, input: Entry): Promise<number> {
  const range = normalizeDateRange(input)

  const updated = await db()
    .update(profileEntries)
    .set({
      kind: input.kind,
      title: input.title,
      organization: input.organization,
      location: input.location,
      startDate: range.startDate,
      endDate: range.endDate,
      isCurrent: range.isCurrent,
      data: entryData(input),
      updatedAt: new Date(),
    })
    .where(and(eq(profileEntries.id, id), eq(profileEntries.userId, userId)))
    .returning({ id: profileEntries.id })

  return updated.length
}

export async function deleteEntry(userId: string, id: string): Promise<number> {
  const deleted = await db()
    .delete(profileEntries)
    .where(and(eq(profileEntries.id, id), eq(profileEntries.userId, userId)))
    .returning({ id: profileEntries.id })
  return deleted.length
}

export function reorderEntriesQuery(userId: string, kind: EntryKind, orderedIds: string[]) {
  const values = sql.join(
    orderedIds.map((id, index) => sql`(${id}::text, ${index}::int)`),
    sql`, `,
  )
  return sql`
    update profile_entries as p
    set sort_order = v.ord, updated_at = now()
    from (values ${values}) as v(id, ord)
    where p.id = v.id and p.user_id = ${userId} and p.kind = ${sql.param(kind)}::entry_kind
  `
}

export async function reorderEntries(userId: string, kind: EntryKind, orderedIds: string[]): Promise<number> {
  if (orderedIds.length === 0) return 0
  const result = await db().execute(reorderEntriesQuery(userId, kind, orderedIds))
  return (result as { rowCount?: number }).rowCount ?? orderedIds.length
}

async function ownsEntry(userId: string, entryId: string): Promise<boolean> {
  const rows = await db()
    .select({ id: profileEntries.id })
    .from(profileEntries)
    .where(and(eq(profileEntries.id, entryId), eq(profileEntries.userId, userId)))
    .limit(1)
  return rows.length > 0
}

export async function upsertBullet(
  userId: string,
  input: Bullet & { id?: string },
): Promise<{ id: string; metricStatus: MetricStatus }> {
  if (!(await ownsEntry(userId, input.entryId))) throw new Error('entry not found')

  const metricStatus = deriveMetricStatus(input)

  if (input.id) {
    const updated = await db()
      .update(entryBullets)
      .set({ text: input.text, x: input.x, y: input.y, z: input.z, metricStatus })
      .where(and(eq(entryBullets.id, input.id), eq(entryBullets.userId, userId)))
      .returning({ id: entryBullets.id })
    if (updated.length === 0) throw new Error('bullet not found')
    return { id: updated[0].id, metricStatus }
  }

  const rows = await db()
    .select({ next: sql<number>`coalesce(max(${entryBullets.sortOrder}), -1) + 1` })
    .from(entryBullets)
    .where(eq(entryBullets.entryId, input.entryId))

  const id = newId('blt')
  await db().insert(entryBullets).values({
    id,
    entryId: input.entryId,
    userId,
    text: input.text,
    x: input.x,
    y: input.y,
    z: input.z,
    metricStatus,
    sortOrder: rows[0]?.next ?? 0,
  })

  return { id, metricStatus }
}

export async function deleteBullet(userId: string, id: string): Promise<number> {
  const deleted = await db()
    .delete(entryBullets)
    .where(and(eq(entryBullets.id, id), eq(entryBullets.userId, userId)))
    .returning({ id: entryBullets.id })
  return deleted.length
}

export function reorderBulletsQuery(userId: string, entryId: string, orderedIds: string[]) {
  const values = sql.join(
    orderedIds.map((id, index) => sql`(${id}::text, ${index}::int)`),
    sql`, `,
  )
  return sql`
    update entry_bullets as b
    set sort_order = v.ord
    from (values ${values}) as v(id, ord)
    where b.id = v.id and b.user_id = ${userId} and b.entry_id = ${entryId}
  `
}

export async function reorderBullets(userId: string, entryId: string, orderedIds: string[]): Promise<number> {
  if (orderedIds.length === 0) return 0
  const result = await db().execute(reorderBulletsQuery(userId, entryId, orderedIds))
  return (result as { rowCount?: number }).rowCount ?? orderedIds.length
}
