import Link from 'next/link'
import { cn } from '@/lib/cn'

export type SegmentedTab = {
  label: string
  href: string
  active: boolean
  count?: number
}

export function SegmentedTabs({ tabs, className }: { tabs: SegmentedTab[]; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1', className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors',
            tab.active
              ? 'bg-card font-medium text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] tabular-nums',
                tab.active ? 'bg-primary/10 text-primary' : 'bg-border/60 text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  )
}
