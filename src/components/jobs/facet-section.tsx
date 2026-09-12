'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/cn'

export type FacetOption = {
  value: string
  label: string
  count: number
  active: boolean
  href: string
}

const VISIBLE_WHEN_COLLAPSED = 6
const SEARCH_RESULT_LIMIT = 40

function OptionLink({ option }: { option: FacetOption }) {
  return (
    <Link
      href={option.href}
      aria-pressed={option.active}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/60',
        option.active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          option.active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
        )}
      >
        {option.active ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="truncate">{option.label}</span>
      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/70">
        {option.count.toLocaleString('en-US')}
      </span>
    </Link>
  )
}

export function FacetSection({
  title,
  options,
  selectedCount,
  defaultOpen = false,
  searchable = false,
  searchPlaceholder = 'Search',
  visibleCount = VISIBLE_WHEN_COLLAPSED,
}: {
  title: string
  options: FacetOption[]
  selectedCount: number
  defaultOpen?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  visibleCount?: number
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const needle = query.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!needle) return options
    return options.filter((option) => option.label.toLowerCase().includes(needle))
  }, [needle, options])

  if (options.length === 0) return null

  const searching = needle.length > 0
  const visible = searching ? matches.slice(0, SEARCH_RESULT_LIMIT) : expanded ? matches : matches.slice(0, visibleCount)
  const hidden = searching ? 0 : matches.length - visible.length

  return (
    <details open={defaultOpen} className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        {selectedCount ? (
          <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-medium tabular-nums text-primary">
            {selectedCount}
          </span>
        ) : null}
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-0.5 px-2 pb-3">
        {searchable ? (
          <div className="relative px-0 pb-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={`Search ${title.toLowerCase()}`}
              className="h-8 w-full rounded-lg border border-input bg-card pl-8 pr-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary"
            />
          </div>
        ) : null}

        {visible.map((option) => (
          <OptionLink key={option.value} option={option} />
        ))}

        {visible.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No match for “{query.trim()}”.</p>
        ) : null}

        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:bg-accent/60"
          >
            Show {hidden} more
          </button>
        ) : null}

        {!searching && expanded && matches.length > visibleCount ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:bg-accent/60"
          >
            Show less
          </button>
        ) : null}
      </div>
    </details>
  )
}
