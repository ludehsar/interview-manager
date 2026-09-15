import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import type { MetricStatus } from '@/domain/profile/xyz'

const LABELS: Record<MetricStatus, { text: string; className: string }> = {
  QUANTIFIED: { text: 'Quantified', className: 'border-success/40 text-success' },
  ESTIMATED: { text: 'Estimated', className: 'border-warning/40 text-warning' },
  MISSING: { text: 'No metric', className: 'border-border text-muted-foreground' },
}

export function MetricBadge({ status, className }: { status: MetricStatus; className?: string }) {
  const label = LABELS[status]
  return (
    <Badge variant="outline" className={cn('font-normal', label.className, className)}>
      {label.text}
    </Badge>
  )
}
