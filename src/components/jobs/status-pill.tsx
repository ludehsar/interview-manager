import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const TONES: Record<Tone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground [&>span]:bg-muted-foreground',
  success: 'border-success/30 bg-success/10 text-success [&>span]:bg-success',
  warning: 'border-warning/30 bg-warning/10 text-[oklch(0.52_0.13_70)] [&>span]:bg-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive [&>span]:bg-destructive',
  info: 'border-primary/25 bg-primary/10 text-primary [&>span]:bg-primary',
}

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium',
        TONES[tone],
      )}
    >
      <span className="size-1.5 rounded-full" />
      {label}
    </span>
  )
}

export function stateTone(state: string | null | undefined): Tone {
  if (state === 'SAVED') return 'info'
  if (state === 'APPLIED') return 'success'
  if (state === 'DISMISSED') return 'danger'
  return 'neutral'
}

export function regionTone(region: string): Tone {
  if (region === 'WORLDWIDE') return 'success'
  if (region === 'APAC') return 'info'
  if (region === 'BANGLADESH') return 'warning'
  return 'neutral'
}
