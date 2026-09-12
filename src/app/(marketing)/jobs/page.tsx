import { Suspense } from 'react'
import { Briefcase } from 'lucide-react'
import { JobFilterPanel } from '@/components/jobs/job-filters'
import { JobPagination } from '@/components/jobs/job-pagination'
import { JobSearchForm } from '@/components/jobs/job-search-form'
import { JobTable } from '@/components/jobs/job-table'
import { JobTableSkeleton } from '@/components/jobs/job-list-skeleton'
import { SegmentedTabs, type SegmentedTab } from '@/components/shell/segmented-tabs'
import { Card, CardContent } from '@/components/ui/card'
import { countJobs, decodeCursor, DEFAULT_PAGE_SIZE, searchJobs, type JobFilters } from '@/domain/jobs/search'
import type { RemoteRegion } from '@/domain/jobs/types'
import { getCachedFacets } from '@/lib/jobs-data'
import { filtersToParams, parseJobFilters, parseTrail, type SearchParams } from '@/lib/jobs-query'

export const metadata = {
  title: 'Remote jobs',
  description: 'Remote roles pulled straight from company applicant tracking systems and curated remote boards.',
}

const REGION_TABS: { label: string; value: RemoteRegion | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Worldwide', value: 'WORLDWIDE' },
  { label: 'APAC', value: 'APAC' },
  { label: 'Bangladesh', value: 'BANGLADESH' },
]

function SortToggle({ filters }: { filters: JobFilters }) {
  const tabs: SegmentedTab[] = [
    {
      label: 'Most relevant',
      active: filters.sort === 'relevance',
      href: `/jobs${filtersToParams({ ...filters, sort: 'relevance' }, { cursor: undefined, trail: undefined })}`,
    },
    {
      label: 'Newest',
      active: filters.sort === 'recent',
      href: `/jobs${filtersToParams({ ...filters, sort: 'recent' }, { cursor: undefined, trail: undefined })}`,
    },
  ]
  return <SegmentedTabs tabs={tabs} className="shrink-0" />
}

function regionTabs(filters: JobFilters): SegmentedTab[] {
  const active = filters.region?.length === 1 ? filters.region[0] : undefined
  return REGION_TABS.map((tab) => ({
    label: tab.label,
    active: active === tab.value,
    href: `/jobs${filtersToParams(
      { ...filters, region: tab.value ? [tab.value] : undefined },
      { cursor: undefined, trail: undefined },
    )}`,
  }))
}

async function JobResults({
  filters,
  cursor,
  trail,
}: {
  filters: JobFilters
  cursor: string | undefined
  trail: string[]
}) {
  const facetKey = filtersToParams({ ...filters, sort: 'recent' }) || 'all'
  const [page, facets, total] = await Promise.all([
    searchJobs(filters, decodeCursor(cursor, filters.sort)),
    getCachedFacets(filters, facetKey),
    countJobs(filters),
  ])

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[264px_1fr]">
      <JobFilterPanel filters={filters} facets={facets} />

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{total.toLocaleString('en-US')}</span>
            {total === 1 ? ' role' : ' roles'}
            {filters.q ? ` matching "${filters.q}"` : ''}
          </p>
          {filters.q ? <SortToggle filters={filters} /> : null}
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          <JobTable jobs={page.items} />
          <JobPagination
            filters={filters}
            cursor={cursor}
            trail={trail}
            nextCursor={page.nextCursor}
            shown={page.items.length}
            total={total}
            pageSize={DEFAULT_PAGE_SIZE}
          />
        </Card>
      </div>
    </div>
  )
}

export default async function JobsPage({ searchParams }: PageProps<'/jobs'>) {
  const params = (await searchParams) as SearchParams
  const filters = parseJobFilters(params)
  const cursor = typeof params.cursor === 'string' ? params.cursor : undefined
  const trail = parseTrail(params.trail)

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Card className="gap-0 py-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground">
              <Briefcase className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold">Open roles from the source</h2>
              <p className="text-sm text-muted-foreground">
                Pulled directly from company applicant tracking systems and curated remote boards.
              </p>
            </div>
          </div>
          <JobSearchForm filters={filters} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs tabs={regionTabs(filters)} />
      </div>

      <Suspense key={`${filtersToParams(filters)}|${cursor ?? ''}`} fallback={<JobTableSkeleton />}>
        <JobResults filters={filters} cursor={cursor} trail={trail} />
      </Suspense>
    </div>
  )
}
