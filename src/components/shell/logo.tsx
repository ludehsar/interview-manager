import { cn } from '@/lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center', className)} aria-hidden>
      <span className="size-3.5 rounded-full bg-primary" />
      <span className="-ml-1.5 size-3.5 rounded-full bg-warning" />
      <span className="-ml-1.5 size-3.5 rounded-full bg-[oklch(0.78_0.13_195)]" />
    </span>
  )
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {collapsed ? null : <span className="whitespace-nowrap text-lg font-semibold tracking-tight">remote jobs</span>}
      <LogoMark />
    </span>
  )
}
