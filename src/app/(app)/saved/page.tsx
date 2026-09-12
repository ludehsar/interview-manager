import { Bookmark } from 'lucide-react'
import { JobTable, type JobTableRow } from '@/components/jobs/job-table'
import { SegmentedTabs, type SegmentedTab } from '@/components/shell/segmented-tabs'
import { Card, CardContent } from '@/components/ui/card'
import { getSavedJobs, getUserJobCounts } from '@/lib/jobs-data'
import { requireUserId } from '@/lib/auth'
import type { SearchParams } from '@/lib/jobs-query'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Saved jobs' }

const TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Saved', value: 'SAVED' },
  { label: 'Applied', value: 'APPLIED' },
  { label: 'Not interested', value: 'DISMISSED' },
] as const

type TabValue = (typeof TABS)[number]['value']

function parseTab(value: string | string[] | undefined): TabValue {
  const candidate = typeof value === 'string' ? value.toUpperCase() : 'ALL'
  return (TABS.find((tab) => tab.value === candidate)?.value ?? 'ALL') as TabValue
}

export default async function SavedPage({ searchParams }: PageProps<'/saved'>) {
  const params = (await searchParams) as SearchParams
  const tab = parseTab(params.status)
  const userId = await requireUserId()

  const [rows, counts] = await Promise.all([
    getSavedJobs(userId, tab === 'ALL' ? undefined : tab),
    getUserJobCounts(userId),
  ])

  const states = new Map(rows.map((row) => [row.id, row.state]))
  const jobs: JobTableRow[] = rows.map((row) => ({ ...row, applyUrl: row.applyUrl ?? undefined }))

  const tabs: SegmentedTab[] = TABS.map((entry) => ({
    label: entry.label,
    active: tab === entry.value,
    href: entry.value === 'ALL' ? '/saved' : `/saved?status=${entry.value.toLowerCase()}`,
    count:
      entry.value === 'ALL'
        ? counts.saved + counts.applied + counts.dismissed
        : entry.value === 'SAVED'
          ? counts.saved
          : entry.value === 'APPLIED'
            ? counts.applied
            : counts.dismissed,
  }))

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Card className="gap-0 py-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground">
              <Bookmark className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold">Jobs you are tracking</h2>
              <p className="text-sm text-muted-foreground">
                Statuses you set from the job list and detail pages collect here.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {counts.saved + counts.applied + counts.dismissed} jobs tracked
          </p>
        </CardContent>
      </Card>

      <SegmentedTabs tabs={tabs} />

      <Card className="gap-0 overflow-hidden py-0">
        <JobTable
          jobs={jobs}
          states={states}
          showStatus
          emptyMessage={
            tab === 'ALL'
              ? 'Nothing tracked yet. Save a job from the list to see it here.'
              : 'No jobs with this status yet.'
          }
        />
      </Card>
    </div>
  )
}
