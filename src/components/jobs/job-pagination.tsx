import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { JobFilters } from '@/domain/jobs/search'
import { filtersToParams, serializeTrail } from '@/lib/jobs-query'

export function JobPagination({
  filters,
  basePath = '/jobs',
  cursor,
  trail,
  nextCursor,
  shown,
  total,
  pageSize,
}: {
  filters: JobFilters
  basePath?: string
  cursor: string | undefined
  trail: string[]
  nextCursor: string | null
  shown: number
  total: number
  pageSize: number
}) {
  const page = trail.length + 1
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastShown = (page - 1) * pageSize + shown

  const previousTrail = trail.slice(0, -1)
  const previousCursor = trail[trail.length - 1]
  const previousHref = cursor
    ? `${basePath}${filtersToParams(filters, {
        cursor: previousCursor,
        trail: serializeTrail(previousTrail),
      })}`
    : null

  const nextHref = nextCursor
    ? `${basePath}${filtersToParams(filters, {
        cursor: nextCursor,
        trail: serializeTrail(cursor ? [...trail, cursor] : trail),
      })}`
    : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? 'No results' : `Showing ${firstShown}-${lastShown} of ${total.toLocaleString('en-US')}`}
      </p>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!previousHref} asChild={Boolean(previousHref)}>
          {previousHref ? (
            <Link href={previousHref}>
              <ArrowLeft className="size-4" />
              Previous
            </Link>
          ) : (
            <span>
              <ArrowLeft className="size-4" />
              Previous
            </span>
          )}
        </Button>

        <span className="rounded-md border border-border bg-card px-3 py-1.5 text-sm tabular-nums">
          {page}
          <span className="text-muted-foreground"> / {totalPages.toLocaleString('en-US')}</span>
        </span>

        <Button variant="outline" size="sm" disabled={!nextHref} asChild={Boolean(nextHref)}>
          {nextHref ? (
            <Link href={nextHref}>
              Next
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <span>
              Next
              <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
