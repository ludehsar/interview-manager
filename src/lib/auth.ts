import { auth } from '@clerk/nextjs/server'
import { ensureUser, userIdForClerkId } from '@/domain/profile/users'

export async function requireClerkId() {
  const { userId } = await auth.protect()
  return userId
}

export async function requireUserId() {
  const clerkId = await requireClerkId()
  const existing = await userIdForClerkId(clerkId)
  if (existing) return existing
  const created = await ensureUser(clerkId)
  return created.id
}

export async function optionalUserId() {
  const { userId } = await auth()
  if (!userId) return null
  return userIdForClerkId(userId)
}
