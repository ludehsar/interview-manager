import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

type Report = {
  score: number
  parsedChars: number
  headings: { expected: string[]; found: string[]; missing: string[] }
  coverage: { keyword: string; inResume: boolean }[]
  ratio: number
  bulletRoundTrip: { bulletId: string; found: boolean }[]
  issues: { code: string; detail: string }[]
}

export function AtsReport({ score, report }: { score: number | null; report: Record<string, unknown> | null }) {
  if (score === null) {
    return <p className="text-sm text-muted-foreground">The ATS check runs after the PDF is rendered.</p>
  }

  const data = report as unknown as Report | null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Parse-back score</span>
          <span className="text-lg font-semibold tabular-nums">{score}</span>
        </div>
        <Progress value={score} className="h-1.5" />
      </div>

      {data ? (
        <>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Headings</p>
            <div className="flex flex-wrap gap-1.5">
              {data.headings.expected.map((heading) => (
                <Badge
                  key={heading}
                  variant="outline"
                  className={data.headings.missing.includes(heading) ? 'border-destructive/40 text-destructive' : ''}
                >
                  {heading}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Keyword coverage</p>
            <div className="flex flex-wrap gap-1.5">
              {data.coverage.map((entry) => (
                <Badge
                  key={entry.keyword}
                  variant={entry.inResume ? 'secondary' : 'outline'}
                  className={entry.inResume ? 'font-normal' : 'font-normal text-muted-foreground'}
                >
                  {entry.keyword}
                </Badge>
              ))}
            </div>
          </div>

          {data.issues.length > 0 ? (
            <ul className="space-y-1.5">
              {data.issues.map((issue, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{issue.code}</span> — {issue.detail}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Every heading and bullet survived the round trip through the PDF text layer.
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
