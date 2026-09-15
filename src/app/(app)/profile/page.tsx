import { currentUser } from '@clerk/nextjs/server'
import { Bookmark, CheckCircle2, Mail, MapPin, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntryList } from '@/components/profile/entry-list'
import { ExtractionReview } from '@/components/profile/extraction-review'
import { GapInterview } from '@/components/profile/gap-interview'
import { KnowledgeCard } from '@/components/profile/knowledge-card'
import { ResumeUpload } from '@/components/profile/resume-upload'
import { PreferencesForm } from '@/components/profile/preferences-form'
import { ProfileBasicsForm } from '@/components/profile/profile-basics-form'
import { getUserJobCounts } from '@/lib/jobs-data'
import { getProfileOverview } from '@/lib/profile-data'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const userId = await requireUserId()
  const [user, counts, overview] = await Promise.all([
    currentUser(),
    getUserJobCounts(userId),
    getProfileOverview(userId),
  ])

  const { profile, byKind, uploads, knowledge } = overview
  const email = profile.email ?? user?.primaryEmailAddress?.emailAddress ?? ''

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
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
                  {(profile.fullName ?? user?.firstName ?? 'U').charAt(0)}
                </div>
              )}

              <div>
                <p className="text-lg font-semibold">{profile.fullName ?? user?.fullName ?? 'Your profile'}</p>
                <p className="text-sm text-muted-foreground">{profile.headline ?? 'Add a headline'}</p>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{email || 'No email on file'}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  <span className="truncate">{profile.location ?? 'Location not set'}</span>
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

          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-4">
              <CardTitle className="text-base">Resume readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Entries</span>
                <span className="font-medium tabular-nums">{overview.counts.entries}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bullets</span>
                <span className="font-medium tabular-nums">{overview.counts.bullets}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quantified</span>
                <span className="font-medium tabular-nums text-success">{overview.counts.quantified}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Missing a metric</span>
                <span className="font-medium tabular-nums">{overview.counts.gaps}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="gap-0 py-5">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4">
              <CardTitle className="text-base">Account</CardTitle>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Signed in with Clerk
              </Badge>
            </CardHeader>
            <CardContent className="px-5">
              <ProfileBasicsForm
                initial={{
                  fullName: profile.fullName ?? user?.fullName ?? null,
                  headline: profile.headline,
                  location: profile.location,
                  email: email || null,
                  phone: profile.phone,
                  links: profile.links,
                }}
              />
            </CardContent>
          </Card>

          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-4">
              <CardTitle className="text-base">Import from a resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5">
              <ResumeUpload />
              {uploads.map((upload) => (
                <ExtractionReview
                  key={upload.id}
                  uploadId={upload.id}
                  fileName={upload.fileName}
                  status={upload.status}
                  error={upload.error}
                  extracted={upload.extracted}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-4">
              <CardTitle className="text-base">Experience and knowledge</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <Tabs defaultValue="EXPERIENCE">
                <TabsList>
                  <TabsTrigger value="EXPERIENCE">Experience</TabsTrigger>
                  <TabsTrigger value="PROJECT">Projects</TabsTrigger>
                  <TabsTrigger value="EDUCATION">Education</TabsTrigger>
                  <TabsTrigger value="CERTIFICATION">Certifications</TabsTrigger>
                  <TabsTrigger value="SKILL_GROUP">Skills</TabsTrigger>
                </TabsList>

                <TabsContent value="EXPERIENCE" className="pt-4">
                  <EntryList
                    kind="EXPERIENCE"
                    entries={byKind.EXPERIENCE}
                    addLabel="Add role"
                    emptyHint="No roles yet. Add one, then give each a bullet with a number in it — that is what the resume builder can cite."
                  />
                </TabsContent>
                <TabsContent value="PROJECT" className="pt-4">
                  <EntryList
                    kind="PROJECT"
                    entries={byKind.PROJECT}
                    addLabel="Add project"
                    emptyHint="Side projects and internal work both count."
                  />
                </TabsContent>
                <TabsContent value="EDUCATION" className="pt-4">
                  <EntryList
                    kind="EDUCATION"
                    entries={byKind.EDUCATION}
                    addLabel="Add education"
                    emptyHint="Degrees and coursework."
                  />
                </TabsContent>
                <TabsContent value="CERTIFICATION" className="pt-4">
                  <EntryList
                    kind="CERTIFICATION"
                    entries={byKind.CERTIFICATION}
                    addLabel="Add certification"
                    emptyHint="Cloud certs, security certs, anything with an issuer."
                  />
                </TabsContent>
                <TabsContent value="SKILL_GROUP" className="pt-4">
                  <EntryList
                    kind="SKILL_GROUP"
                    entries={byKind.SKILL_GROUP}
                    addLabel="Add skill group"
                    emptyHint="Group related skills, for example Languages or Infrastructure."
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-4">
              <CardTitle className="text-base">Knowledge base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-5">
              <GapInterview gaps={overview.counts.gaps} />
              <KnowledgeCard chunks={knowledge.chunks} nodes={knowledge.nodes} embedded={knowledge.embedded} />
            </CardContent>
          </Card>

          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-4">
              <CardTitle className="text-base">Job preferences</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <PreferencesForm initial={profile.preferences} />
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
