'use server'

import {
  deleteBullet,
  deleteEntry,
  insertEntry,
  reorderBullets,
  reorderEntries,
  updateEntry,
  upsertBullet,
} from '@/domain/profile/entries'
import { decomposeBullet, type Decomposition } from '@/domain/profile/decompose'
import { saveBasics as persistBasics, savePreferences as persistPreferences } from '@/domain/profile/profile'
import {
  basicsSchema,
  bulletSchema,
  bulletTextSchema,
  entryKindSchema,
  entrySchema,
  orderedIdsSchema,
  preferencesSchema,
  type BasicsInput,
  type BulletInput,
  type EntryInput,
  type PreferencesInput,
} from '@/domain/profile/schema'
import type { MetricStatus } from '@/domain/profile/xyz'
import { requireUserId } from '@/lib/auth'

export async function saveBasics(input: BasicsInput): Promise<void> {
  const userId = await requireUserId()
  await persistBasics(userId, basicsSchema.parse(input))
}

export async function savePreferences(input: PreferencesInput): Promise<void> {
  const userId = await requireUserId()
  await persistPreferences(userId, preferencesSchema.parse(input))
}

export async function createEntry(input: EntryInput): Promise<{ id: string }> {
  const userId = await requireUserId()
  return { id: await insertEntry(userId, entrySchema.parse(input)) }
}

export async function saveEntry(id: string, input: EntryInput): Promise<void> {
  const userId = await requireUserId()
  const updated = await updateEntry(userId, id, entrySchema.parse(input))
  if (updated === 0) throw new Error('entry not found')
}

export async function removeEntry(id: string): Promise<void> {
  const userId = await requireUserId()
  const deleted = await deleteEntry(userId, id)
  if (deleted === 0) throw new Error('entry not found')
}

export async function reorderEntryList(kind: string, orderedIds: string[]): Promise<void> {
  const userId = await requireUserId()
  await reorderEntries(userId, entryKindSchema.parse(kind), orderedIdsSchema.parse(orderedIds))
}

export async function saveBullet(
  input: BulletInput & { id?: string },
): Promise<{ id: string; metricStatus: MetricStatus }> {
  const userId = await requireUserId()
  return upsertBullet(userId, { ...bulletSchema.parse(input), id: input.id })
}

export async function decomposeBulletText(text: string): Promise<Decomposition> {
  const userId = await requireUserId()
  return decomposeBullet({ userId, text: bulletTextSchema.parse(text) })
}

export async function removeBullet(id: string): Promise<void> {
  const userId = await requireUserId()
  const deleted = await deleteBullet(userId, id)
  if (deleted === 0) throw new Error('bullet not found')
}

export async function reorderBulletList(entryId: string, orderedIds: string[]): Promise<void> {
  const userId = await requireUserId()
  await reorderBullets(userId, entryId, orderedIdsSchema.parse(orderedIds))
}
