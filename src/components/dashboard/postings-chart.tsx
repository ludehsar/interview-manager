import type { MonthlyPoint } from '@/lib/jobs-data'

const HEIGHT = 180
const BAR_GAP = 6

function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1)))
  for (const factor of [1, 2, 2.5, 5, 10]) {
    const candidate = factor * magnitude
    if (candidate >= raw) return candidate
  }
  return magnitude * 10
}

export function PostingsChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">Not enough history yet to chart postings.</p>
    )
  }

  const peak = Math.max(...data.map((point) => point.posted), 1)
  const step = niceStep(peak / 4)
  const max = step * 4
  const ticks = [0, 1, 2, 3, 4].map((index) => index * step).reverse()
  const groupWidth = 100 / data.length
  const barWidth = (groupWidth - BAR_GAP) / 2

  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between py-1 text-[11px] tabular-nums text-muted-foreground">
        {ticks.map((tick) => (
          <span key={tick}>{tick.toLocaleString('en-US')}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: HEIGHT }}>
          <div className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <span key={tick} className="h-px w-full bg-border" />
            ))}
          </div>

          <svg
            viewBox={`0 0 100 ${HEIGHT}`}
            preserveAspectRatio="none"
            className="relative h-full w-full"
            role="img"
            aria-label="Live postings per month, total and worldwide or APAC"
          >
            {data.map((point, index) => {
              const x = index * groupWidth
              const postedHeight = (point.posted / max) * HEIGHT
              const remoteHeight = (point.worldwide / max) * HEIGHT
              return (
                <g key={`${point.month}-${index}`}>
                  <rect
                    x={x + BAR_GAP / 2}
                    y={HEIGHT - postedHeight}
                    width={barWidth}
                    height={postedHeight}
                    rx={1.5}
                    className="fill-primary"
                  />
                  <rect
                    x={x + BAR_GAP / 2 + barWidth}
                    y={HEIGHT - remoteHeight}
                    width={barWidth}
                    height={remoteHeight}
                    rx={1.5}
                    className="fill-[oklch(0.78_0.13_195)]"
                  />
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-2 flex">
          {data.map((point, index) => (
            <span
              key={`${point.month}-${index}`}
              className="text-center text-[11px] text-muted-foreground"
              style={{ width: `${groupWidth}%` }}
            >
              {point.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
