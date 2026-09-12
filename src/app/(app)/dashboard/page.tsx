import Link from 'next/link'
import { Bookmark, Briefcase, Building2, CheckCircle2 } from 'lucide-react'
import { currentUser } from '@clerk/nextjs/server'
import { PostingsChart } from '@/components/dashboard/postings-chart'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { JobTable, type JobTableRow } from '@/components/jobs/job-table'
import { StatCard } from '@/components/shell/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBoardStats, getMonthlyPostings, getSavedJobs, getTopCompanies, getUserJobCounts } from '@/lib/jobs-data'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard' }

function today(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())
}

export default async function DashboardPage() {
  const userId = await requireUserId()
  const [user, counts, board, monthly, recent, topCompanies] = await Promise.all([
    currentUser(),
    getUserJobCounts(userId),
    getBoardStats(),
    getMonthlyPostings(8),
    getSavedJobs(userId, undefined, 5),
    getTopCompanies(6),
  ])

  const states = new Map(recent.map((row) => [row.id, row.state]))
  const recentJobs: JobTableRow[] = recent.map((row) => ({ ...row, applyUrl: row.applyUrl ?? undefined }))
  const firstName = user?.firstName ?? user?.username ?? 'there'

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Welcome, {firstName}!</h2>
        <p className="text-muted-foreground">{today()}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live jobs"
          value={board.activeJobs.toLocaleString('en-US')}
          icon={Briefcase}
          delta={{ value: board.addedThisWeek, label: 'first seen in the last 7 days' }}
        />
        <StatCard
          label="Companies hiring"
          value={board.companies.toLocaleString('en-US')}
          icon={Building2}
          hint={`${board.worldwide.toLocaleString('en-US')} roles open worldwide`}
        />
        <StatCard label="Saved" value={counts.saved} icon={Bookmark} hint="Roles you shortlisted" />
        <StatCard label="Applied" value={counts.applied} icon={CheckCircle2} hint="Applications you logged" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="gap-0 py-5">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4">
            <CardTitle className="text-base">Postings by month</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                All live postings
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[oklch(0.78_0.13_195)]" />
                Worldwide or APAC
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-5">
            <PostingsChart data={monthly} />
          </CardContent>
        </Card>

        <Card className="gap-0 py-5">
          <CardHeader className="px-5 pb-4">
            <CardTitle className="text-base">Most openings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            {topCompanies.map((company) => (
              <Link
                key={company.company}
                href={`/jobs?company=${encodeURIComponent(company.company)}`}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/60"
              >
                <CompanyLogo company={company.company} domain={company.company_domain} className="size-8" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{company.company}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{company.openings}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <CardTitle className="text-base">Recently tracked</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/saved">View all</Link>
          </Button>
        </CardHeader>
        <JobTable
          jobs={recentJobs}
          states={states}
          showStatus
          emptyMessage="Nothing tracked yet. Save a job from the list to see it here."
        />
      </Card>
    </div>
  )
}
