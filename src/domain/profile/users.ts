import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { profiles, users } from '@/db/schema'
import { newId } from '@/lib/ids'

export async function ensureUser(clerkId: string, email?: string | null) {
  const existing = await db().select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
  if (existing.length > 0) {
    await db().update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, existing[0].id))
    return existing[0]
  }

  const id = newId('usr')
  const [created] = await db()
    .insert(users)
    .values({ id, clerkId, email: email ?? null })
    .onConflictDoUpdate({ target: users.clerkId, set: { lastActiveAt: new Date() } })
    .returning()

  await db().insert(profiles).values({ userId: created.id, email: email ?? null }).onConflictDoNothing()
  return created
}

export async function deleteUserByClerkId(clerkId: string) {
  await db().delete(users).where(eq(users.clerkId, clerkId))
}

export async function userIdForClerkId(clerkId: string) {
  const rows = await db().select({ id: users.id }).from(users).where(eq(users.clerkId, clerkId)).limit(1)
  return rows[0]?.id ?? null
}
