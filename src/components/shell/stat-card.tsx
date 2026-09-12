import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  delta?: { value: number; label: string }
}) {
  const positive = (delta?.value ?? 0) >= 0
  return (
    <Card className="gap-0 py-5">
      <CardContent className="space-y-3 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground">
            <Icon className="size-4" />
          </span>
        </div>

        {delta ? (
          <p className="flex items-center gap-1.5 text-xs">
            <span className={cn('flex items-center gap-0.5 font-medium', positive ? 'text-success' : 'text-destructive')}>
              {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(delta.value)}
            </span>
            <span className="text-muted-foreground">{delta.label}</span>
          </p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
