import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import type { JobFacets, JobFilters as Filters } from '@/domain/jobs/search'
import { cn } from '@/lib/cn'
import { formatEmployment, formatSalary, formatSeniority, formatTier } from '@/lib/format'
import { filtersToParams, toggleValue } from '@/lib/jobs-query'

type MultiKey = 'employmentType' | 'seniority' | 'tier' | 'skills'

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
  for (const value of filters.tier ?? []) {
    chips.push({
      label: formatTier(value),
      href: href(filters, { tier: toggleValue(filters.tier, value) as Filters['tier'] }),
    })
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
  count,
  active,
  href: optionHref,
  shape = 'square',
}: {
  label: string
  count?: number
  active: boolean
  href: string
  shape?: 'square' | 'round'
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
          'flex size-4 shrink-0 items-center justify-center border transition-colors',
          shape === 'square' ? 'rounded-[5px]' : 'rounded-full',
          active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
        )}
      >
        {active ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="truncate">{label}</span>
      {count !== undefined ? (
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/70">
          {count.toLocaleString('en-US')}
        </span>
      ) : null}
    </Link>
  )
}

function Sections({ filters, facets }: { filters: Filters; facets: JobFacets }) {
  const multiGroups: { title: string; key: MultiKey; buckets: JobFacets['seniority']; format?: (v: string) => string }[] =
    [
      { title: 'Seniority', key: 'seniority', buckets: facets.seniority, format: formatSeniority },
      { title: 'Employment type', key: 'employmentType', buckets: facets.employmentType, format: formatEmployment },
      { title: 'Skills', key: 'skills', buckets: facets.skills },
      { title: 'Source', key: 'tier', buckets: facets.tier, format: formatTier },
    ]

  return (
    <>
      <Section title="Date posted" defaultOpen={Boolean(filters.postedWithinDays)}>
        <Option
          label="Any time"
          active={!filters.postedWithinDays}
          href={href(filters, { postedWithinDays: undefined })}
          shape="round"
        />
        {POSTED_OPTIONS.map((option) => (
          <Option
            key={option.value}
            label={option.label}
            shape="round"
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
          shape="round"
          active={!filters.salaryMinUsdMonth}
          href={href(filters, { salaryMinUsdMonth: undefined })}
        />
        {SALARY_OPTIONS.map((option) => (
          <Option
            key={option.value}
            label={`${option.label} / month`}
            shape="round"
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

      {multiGroups.map((group) => {
        const selected = (filters[group.key] as string[] | undefined) ?? []
        const buckets = group.buckets.filter((bucket) => bucket.count > 0 && bucket.value !== 'UNKNOWN')
        if (buckets.length === 0 && selected.length === 0) return null

        const visible = buckets.slice(0, 6)
        const rest = buckets.slice(6)

        return (
          <Section
            key={group.key}
            title={group.title}
            count={selected.length}
            defaultOpen={selected.length > 0 || group.key === 'seniority'}
          >
            {visible.map((bucket) => (
              <Option
                key={bucket.value}
                label={group.format ? group.format(bucket.value) : bucket.value}
                count={bucket.count}
                active={selected.includes(bucket.value)}
                href={href(filters, {
                  [group.key]: toggleValue(selected, bucket.value),
                } as Partial<Filters>)}
              />
            ))}

            {rest.length > 0 ? (
              <details className="group/more">
                <summary className="cursor-pointer list-none rounded-lg px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
                  <span className="group-open/more:hidden">Show {rest.length} more</span>
                  <span className="hidden group-open/more:inline">Show less</span>
                </summary>
                <div className="space-y-0.5 pt-0.5">
                  {rest.map((bucket) => (
                    <Option
                      key={bucket.value}
                      label={group.format ? group.format(bucket.value) : bucket.value}
                      count={bucket.count}
                      active={selected.includes(bucket.value)}
                      href={href(filters, {
                        [group.key]: toggleValue(selected, bucket.value),
                      } as Partial<Filters>)}
                    />
                  ))}
                </div>
              </details>
            ) : null}
          </Section>
        )
      })}
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
