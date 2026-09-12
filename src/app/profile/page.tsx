import { UserButton } from '@clerk/nextjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const userId = await requireUserId()
  const [profile] = await db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <UserButton />
      </div>
      <dl className="space-y-3 text-sm">
        <div className="flex gap-3">
          <dt className="w-32 text-zinc-500">User</dt>
          <dd className="font-mono">{userId}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-32 text-zinc-500">Email</dt>
          <dd>{profile?.email ?? 'not set'}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-32 text-zinc-500">Full name</dt>
          <dd>{profile?.fullName ?? 'not set'}</dd>
        </div>
      </dl>
      <p className="mt-8 text-sm text-zinc-500">
        Profile editing, resume import and the gap interview arrive in phase 2.
      </p>
    </main>
  )
}
