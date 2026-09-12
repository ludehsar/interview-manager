import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { FacetSection, type FacetOption } from '@/components/jobs/facet-section'
import { locationTokenLabel } from '@/domain/jobs/location'
import type { JobFacets, JobFilters as Filters } from '@/domain/jobs/search'
import { cn } from '@/lib/cn'
import { formatEmployment, formatSalary, formatSeniority, formatWorkplace } from '@/lib/format'
import { filtersToParams, toggleValue } from '@/lib/jobs-query'

type MultiKey = 'locations' | 'workplaceType' | 'employmentType' | 'seniority' | 'skills'

const WORKPLACE_ORDER = ['REMOTE', 'HYBRID', 'ONSITE']

const POSTED_OPTIONS = [
  { label: 'Last 24 hours', value: 1 },
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
]

const SALARY_OPTIONS = [
  { label: '$2,000+', value: 2000 },
  { label: '$4,000+', value: 4000 },
  { label: '$6,000+', value: 6000 },
  { label: '$8,000+', value: 8000 },
]

function href(filters: Filters, patch: Partial<Filters>): string {
  return `/jobs${filtersToParams({ ...filters, ...patch }, { cursor: undefined, trail: undefined })}`
}

function activeFilters(filters: Filters) {
  const chips: { label: string; href: string }[] = []

  for (const value of filters.locations ?? []) {
    chips.push({
      label: locationTokenLabel(value),
      href: href(filters, { locations: toggleValue(filters.locations, value) }),
    })
  }
  for (const value of filters.workplaceType ?? []) {
    chips.push({
      label: formatWorkplace(value),
      href: href(filters, { workplaceType: toggleValue(filters.workplaceType, value) as Filters['workplaceType'] }),
    })
  }
  for (const value of filters.seniority ?? []) {
    chips.push({
      label: formatSeniority(value),
      href: href(filters, { seniority: toggleValue(filters.seniority, value) as Filters['seniority'] }),
    })
  }
  for (const value of filters.employmentType ?? []) {
    chips.push({
      label: formatEmployment(value),
      href: href(filters, { employmentType: toggleValue(filters.employmentType, value) as Filters['employmentType'] }),
    })
  }
  for (const value of filters.skills ?? []) {
    chips.push({ label: value, href: href(filters, { skills: toggleValue(filters.skills, value) }) })
  }
  if (filters.company) {
    chips.push({ label: filters.company, href: href(filters, { company: undefined }) })
  }
  if (filters.postedWithinDays) {
    const option = POSTED_OPTIONS.find((entry) => entry.value === filters.postedWithinDays)
    chips.push({
      label: option?.label ?? `Last ${filters.postedWithinDays} days`,
      href: href(filters, { postedWithinDays: undefined }),
    })
  }
  if (filters.salaryMinUsdMonth) {
    chips.push({
      label: `${formatSalary(filters.salaryMinUsdMonth, null)?.replace(' / month', '') ?? ''}+`,
      href: href(filters, { salaryMinUsdMonth: undefined }),
    })
  }
  if (filters.q) {
    chips.push({ label: `"${filters.q}"`, href: href(filters, { q: undefined, sort: 'recent' }) })
  }

  return chips
}

function Section({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        {count ? (
          <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-medium tabular-nums text-primary">
            {count}
          </span>
        ) : null}
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-0.5 px-2 pb-3">{children}</div>
    </details>
  )
}

function Option({
  label,
  active,
  href: optionHref,
}: {
  label: string
  active: boolean
  href: string
}) {
  return (
    <Link
      href={optionHref}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/60',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
          active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
        )}
      >
        {active ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  )
}

type MultiGroup = {
  title: string
  key: MultiKey
  buckets: JobFacets['seniority']
  format?: (value: string) => string
  searchable?: boolean
  searchPlaceholder?: string
  visibleCount?: number
}

function toOptions(filters: Filters, group: MultiGroup): FacetOption[] {
  const selected = (filters[group.key] as string[] | undefined) ?? []
  return group.buckets
    .filter((bucket) => bucket.count > 0 && bucket.value !== 'UNKNOWN')
    .map((bucket) => ({
      value: bucket.value,
      label: group.format ? group.format(bucket.value) : bucket.value,
      count: bucket.count,
      active: selected.includes(bucket.value),
      href: href(filters, { [group.key]: toggleValue(selected, bucket.value) } as Partial<Filters>),
    }))
}

function Sections({ filters, facets }: { filters: Filters; facets: JobFacets }) {
  const workplaceBuckets = [...facets.workplaceType].sort(
    (a, b) => WORKPLACE_ORDER.indexOf(a.value) - WORKPLACE_ORDER.indexOf(b.value),
  )

  const leadGroups: MultiGroup[] = [
    {
      title: 'Location',
      key: 'locations',
      buckets: facets.locations,
      format: locationTokenLabel,
      searchable: true,
      searchPlaceholder: 'Search city or country',
      visibleCount: 8,
    },
    { title: 'Workplace', key: 'workplaceType', buckets: workplaceBuckets, format: formatWorkplace },
  ]

  const multiGroups: MultiGroup[] = [
    { title: 'Seniority', key: 'seniority', buckets: facets.seniority, format: formatSeniority },
    { title: 'Employment type', key: 'employmentType', buckets: facets.employmentType, format: formatEmployment },
    {
      title: 'Skills',
      key: 'skills',
      buckets: facets.skills,
      searchable: true,
      searchPlaceholder: 'Search skills',
      visibleCount: 8,
    },
  ]

  const render = (group: MultiGroup, defaultOpen: boolean) => {
    const selected = (filters[group.key] as string[] | undefined) ?? []
    return (
      <FacetSection
        key={group.key}
        title={group.title}
        options={toOptions(filters, group)}
        selectedCount={selected.length}
        defaultOpen={defaultOpen || selected.length > 0}
        searchable={group.searchable}
        searchPlaceholder={group.searchPlaceholder}
        visibleCount={group.visibleCount}
      />
    )
  }

  return (
    <>
      {leadGroups.map((group) => render(group, true))}

      <Section title="Date posted" defaultOpen={Boolean(filters.postedWithinDays)}>
        <Option
          label="Any time"
          active={!filters.postedWithinDays}
          href={href(filters, { postedWithinDays: undefined })}
        />
        {POSTED_OPTIONS.map((option) => (
          <Option
            key={option.value}
            label={option.label}
            active={filters.postedWithinDays === option.value}
            href={href(filters, {
              postedWithinDays: filters.postedWithinDays === option.value ? undefined : option.value,
            })}
          />
        ))}
      </Section>

      <Section title="Salary floor" defaultOpen={Boolean(filters.salaryMinUsdMonth)}>
        <Option
          label="Any salary"
          active={!filters.salaryMinUsdMonth}
          href={href(filters, { salaryMinUsdMonth: undefined })}
        />
        {SALARY_OPTIONS.map((option) => (
          <Option
            key={option.value}
            label={`${option.label} / month`}
            active={filters.salaryMinUsdMonth === option.value}
            href={href(filters, {
              salaryMinUsdMonth: filters.salaryMinUsdMonth === option.value ? undefined : option.value,
            })}
          />
        ))}
        <p className="px-2 pt-1.5 text-[11px] leading-snug text-muted-foreground">
          Hides roles that do not publish a salary.
        </p>
      </Section>

      {multiGroups.map((group) => render(group, false))}
    </>
  )
}

function Panel({
  filters,
  facets,
  chips,
  hideHeader = false,
}: {
  filters: Filters
  facets: JobFacets
  chips: ReturnType<typeof activeFilters>
  hideHeader?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {hideHeader ? null : (
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {chips.length > 0 ? (
            <Link href="/jobs" className="ml-auto text-xs font-medium text-primary underline-offset-4 hover:underline">
              Clear all
            </Link>
          ) : null}
        </div>
      )}

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
          {chips.map((chip) => (
            <Link
              key={`${chip.label}-${chip.href}`}
              href={chip.href}
              className="group inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <span className="truncate">{chip.label}</span>
              <X className="size-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
          {hideHeader ? (
            <Link href="/jobs" className="ml-auto text-xs font-medium text-primary underline-offset-4 hover:underline">
              Clear all
            </Link>
          ) : null}
        </div>
      ) : null}

      <Sections filters={filters} facets={facets} />
    </div>
  )
}

export function JobFilterPanel({ filters, facets }: { filters: Filters; facets: JobFacets }) {
  const chips = activeFilters(filters)

  return (
    <>
      <details className="group lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          Filters
          {chips.length > 0 ? (
            <span className="rounded-full bg-primary/10 px-1.5 text-[11px] tabular-nums text-primary">
              {chips.length}
            </span>
          ) : null}
          <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-3">
          <Panel filters={filters} facets={facets} chips={chips} hideHeader />
        </div>
      </details>

      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <Panel filters={filters} facets={facets} chips={chips} />
      </aside>
    </>
  )
}
