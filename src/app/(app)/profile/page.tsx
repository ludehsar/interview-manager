import { eq } from 'drizzle-orm'
import { Bookmark, CheckCircle2, Mail, MapPin, XCircle } from 'lucide-react'
import { currentUser } from '@clerk/nextjs/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { getUserJobCounts } from '@/lib/jobs-data'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const userId = await requireUserId()
  const [user, counts, rows] = await Promise.all([
    currentUser(),
    getUserJobCounts(userId),
    db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
  ])
  const profile = rows[0]
  const email = user?.primaryEmailAddress?.emailAddress ?? profile?.email ?? ''

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="gap-0 py-0">
          <div className="h-24 rounded-t-xl bg-gradient-to-r from-primary/25 via-primary/10 to-[oklch(0.85_0.09_195)]/30" />
          <CardContent className="-mt-10 space-y-4 px-5 pb-6">
            {user?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.imageUrl}
                alt=""
                width={80}
                height={80}
                className="size-20 rounded-full border-4 border-card object-cover"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full border-4 border-card bg-muted text-xl font-semibold">
                {(user?.firstName ?? 'U').charAt(0)}
              </div>
            )}

            <div>
              <p className="text-lg font-semibold">{user?.fullName ?? profile?.fullName ?? 'Your profile'}</p>
              <p className="text-sm text-muted-foreground">{profile?.headline ?? 'Add a headline in phase 2'}</p>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span className="truncate">{email || 'No email on file'}</span>
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span className="truncate">{profile?.location ?? 'Location not set'}</span>
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border p-2">
                <p className="text-lg font-semibold tabular-nums">{counts.saved}</p>
                <p className="text-xs text-muted-foreground">Saved</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-lg font-semibold tabular-nums">{counts.applied}</p>
                <p className="text-xs text-muted-foreground">Applied</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-lg font-semibold tabular-nums">{counts.dismissed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="gap-0 py-5">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4">
              <CardTitle className="text-base">Account</CardTitle>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Managed by Clerk
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full-name">Full name</Label>
                <Input id="full-name" defaultValue={user?.fullName ?? ''} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue={email} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-id">Account id</Label>
                <Input id="account-id" defaultValue={userId} readOnly className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-since">Member since</Label>
                <Input
                  id="member-since"
                  readOnly
                  defaultValue={
                    user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : ''
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-4">
              <CardTitle className="text-base">Job preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5">
              <p className="text-sm text-muted-foreground">
                Target titles, seniority, regions and salary floor drive resume tailoring and match scoring. The editor
                for them arrives with the profile work in phase 2 — the <code className="text-xs">preferences</code>{' '}
                column already exists on your row.
              </p>
              <div className="flex flex-wrap gap-2">
                {(profile?.preferences?.remoteRegions ?? []).length > 0 ? (
                  (profile?.preferences?.remoteRegions ?? []).map((region) => (
                    <Badge key={region} variant="secondary">
                      {region}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    No regions set
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-4">
              <CardTitle className="text-base">Tracking summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Bookmark className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium tabular-nums">{counts.saved}</p>
                  <p className="text-xs text-muted-foreground">Saved for later</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <CheckCircle2 className="size-4 text-success" />
                <div>
                  <p className="text-sm font-medium tabular-nums">{counts.applied}</p>
                  <p className="text-xs text-muted-foreground">Marked applied</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <XCircle className="size-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium tabular-nums">{counts.dismissed}</p>
                  <p className="text-xs text-muted-foreground">Not interested</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
