import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { entryBullets, profileEntries, profileUploads } from '@/db/schema'
import type { ExtractedResume } from '@/ai/schemas/resume-extract'
import { newId } from '@/lib/ids'
import { readProfile, saveBasics } from './profile'
import { uploadKey, type UploadStatus } from './upload-limits'
import { deriveMetricStatus, normalizeDateRange } from './xyz'

export type UploadRow = {
  id: string
  userId: string
  fileName: string
  contentType: string
  bytes: number | null
  s3Key: string
  status: UploadStatus
  error: string | null
  extracted: ExtractedResume | null
  entryIds: string[]
  createdAt: Date
  updatedAt: Date
}

function toRow(row: typeof profileUploads.$inferSelect): UploadRow {
  return {
    id: row.id,
    userId: row.userId,
    fileName: row.fileName,
    contentType: row.contentType,
    bytes: row.bytes,
    s3Key: row.s3Key,
    status: row.status,
    error: row.error,
    extracted: (row.extracted ?? null) as ExtractedResume | null,
    entryIds: row.entryIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function createUpload(input: {
  userId: string
  fileName: string
  contentType: string
  bytes: number | null
}): Promise<UploadRow> {
  const id = newId('upl')
  const [row] = await db()
    .insert(profileUploads)
    .values({
      id,
      userId: input.userId,
      fileName: input.fileName,
      contentType: input.contentType,
      bytes: input.bytes,
      s3Key: uploadKey(input.userId, id),
    })
    .returning()
  return toRow(row)
}

export async function readUpload(uploadId: string, userId?: string): Promise<UploadRow | null> {
  const where = userId
    ? and(eq(profileUploads.id, uploadId), eq(profileUploads.userId, userId))
    : eq(profileUploads.id, uploadId)
  const rows = await db().select().from(profileUploads).where(where).limit(1)
  return rows[0] ? toRow(rows[0]) : null
}

export async function listUploads(userId: string, limit = 10): Promise<UploadRow[]> {
  const rows = await db()
    .select()
    .from(profileUploads)
    .where(eq(profileUploads.userId, userId))
    .orderBy(desc(profileUploads.createdAt))
    .limit(limit)
  return rows.map(toRow)
}

export async function markStatus(uploadId: string, status: UploadStatus, error?: string | null): Promise<void> {
  await db()
    .update(profileUploads)
    .set({ status, error: error ?? null, updatedAt: new Date() })
    .where(eq(profileUploads.id, uploadId))
}

export async function storeExtraction(uploadId: string, extracted: ExtractedResume): Promise<void> {
  await db()
    .update(profileUploads)
    .set({
      extracted: extracted as unknown as Record<string, unknown>,
      status: 'EXTRACTED',
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(profileUploads.id, uploadId))
}

async function nextSortOrders(userId: string): Promise<Map<string, number>> {
  const rows = await db()
    .select({ kind: profileEntries.kind, sortOrder: profileEntries.sortOrder })
    .from(profileEntries)
    .where(eq(profileEntries.userId, userId))

  const next = new Map<string, number>()
  for (const row of rows) {
    next.set(row.kind, Math.max(next.get(row.kind) ?? -1, row.sortOrder) + 1)
  }
  return next
}

function blank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === ''
}

async function fillMissingBasics(userId: string, extracted: ExtractedResume): Promise<string[]> {
  const profile = await readProfile(userId)
  const filled: string[] = []

  const merged = {
    fullName: profile?.fullName ?? null,
    headline: profile?.headline ?? null,
    location: profile?.location ?? null,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    links: profile?.links ?? [],
  }

  for (const field of ['fullName', 'headline', 'location', 'email', 'phone'] as const) {
    const candidate = extracted.basics[field]
    if (blank(merged[field]) && !blank(candidate)) {
      merged[field] = candidate
      filled.push(field)
    }
  }

  if (merged.links.length === 0 && extracted.basics.links.length > 0) {
    merged.links = extracted.basics.links.slice(0, 6)
    filled.push('links')
  }

  if (filled.length > 0) await saveBasics(userId, merged)
  return filled
}

export async function acceptExtraction(
  userId: string,
  uploadId: string,
  entryIndexes: number[],
): Promise<{ created: number; basicsFilled: string[] }> {
  const upload = await readUpload(uploadId, userId)
  if (!upload) throw new Error('upload not found')
  if (!upload.extracted) throw new Error('upload has not been extracted yet')

  if (upload.entryIds.length > 0) {
    for (const entryId of upload.entryIds) {
      await db().delete(profileEntries).where(and(eq(profileEntries.id, entryId), eq(profileEntries.userId, userId)))
    }
  }

  const selected = upload.extracted.entries.filter((_, index) => entryIndexes.includes(index))
  const sortOrders = await nextSortOrders(userId)
  const createdIds: string[] = []

  for (const entry of selected) {
    const entryId = newId('ent')
    const range = normalizeDateRange(entry)
    const sortOrder = sortOrders.get(entry.kind) ?? 0
    sortOrders.set(entry.kind, sortOrder + 1)

    await db().insert(profileEntries).values({
      id: entryId,
      userId,
      kind: entry.kind,
      title: entry.title,
      organization: entry.organization,
      location: entry.location,
      startDate: range.startDate,
      endDate: range.endDate,
      isCurrent: range.isCurrent,
      data: { skills: entry.skills, summary: entry.summary },
      sortOrder,
    })

    const bullets = entry.bullets.map((bullet, index) => ({
      id: newId('blt'),
      entryId,
      userId,
      text: bullet.text,
      x: bullet.x,
      y: bullet.y,
      z: bullet.z,
      metricStatus: deriveMetricStatus(bullet),
      sortOrder: index,
    }))
    if (bullets.length > 0) await db().insert(entryBullets).values(bullets)

    createdIds.push(entryId)
  }

  const basicsFilled = await fillMissingBasics(userId, upload.extracted)

  await db()
    .update(profileUploads)
    .set({ entryIds: createdIds, status: 'ACCEPTED', updatedAt: new Date() })
    .where(eq(profileUploads.id, uploadId))

  return { created: createdIds.length, basicsFilled }
}

export async function discardUpload(userId: string, uploadId: string): Promise<void> {
  await db().delete(profileUploads).where(and(eq(profileUploads.id, uploadId), eq(profileUploads.userId, userId)))
}

export { MAX_UPLOAD_BYTES, UPLOAD_CONTENT_TYPE, uploadKey, type UploadStatus } from './upload-limits'
