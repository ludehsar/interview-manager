'use client'

import { useEffect, useState } from 'react'
import { formatExactDate, formatPostedAt, toDate } from '@/lib/format'

const REFRESH_MS = 30_000

export function RelativeTime({
  date,
  fallback = 'Unknown',
  className,
}: {
  date: Date | string | number | null | undefined
  fallback?: string
  className?: string
}) {
  const parsed = toDate(date)
  const time = parsed ? parsed.getTime() : null
  const [label, setLabel] = useState(() => formatPostedAt(time))

  useEffect(() => {
    if (time === null) return
    const timer = setInterval(() => setLabel(formatPostedAt(time)), REFRESH_MS)
    return () => clearInterval(timer)
  }, [time])

  if (!parsed || time === null) return <span className={className}>{fallback}</span>

  return (
    <time dateTime={parsed.toISOString()} title={formatExactDate(parsed)} className={className} suppressHydrationWarning>
      {label}
    </time>
  )
}
