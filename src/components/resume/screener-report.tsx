import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

type Screener = {
  score: number
  verdict: string
  sixSecondScan?: { passes: boolean; notes: string }
  rubric?: { criterion: string; score: number; weight: number; comment: string }[]
  perBullet?: { bulletId: string; score: number; issue: string; comment: string }[]
  redFlags?: { code: string; severity: string; detail: string }[]
  keywordCoverage?: { matched: string[]; missing: string[]; ratio: number }
}

export function ScreenerReport({ score, report }: { score: number | null; report: Record<string, unknown> | null }) {
  if (score === null || !report) {
    return (
      <p className="text-sm text-muted-foreground">
        The screener runs after the draft passes the guard. It scores the resume the way a recruiter would and explains
        each score.
      </p>
    )
  }

  const data = report as unknown as Screener

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Screener score</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{data.verdict}</Badge>
            <span className="text-lg font-semibold tabular-nums">{score}</span>
          </div>
        </div>
        <Progress value={score} className="h-1.5" />
      </div>

      {data.sixSecondScan ? (
        <div className="rounded-lg border border-border p-3">
          <p className="pb-1 text-sm font-medium">
            Six-second scan {data.sixSecondScan.passes ? 'passes' : 'fails'}
          </p>
          <p className="text-sm text-muted-foreground">{data.sixSecondScan.notes}</p>
        </div>
      ) : null}

      {data.rubric?.length ? (
        <div className="space-y-2">
          {data.rubric.map((entry) => (
            <div key={entry.criterion} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{entry.criterion}</span>
                <span className="tabular-nums text-muted-foreground">{entry.score}</span>
              </div>
              <Progress value={entry.score} className="h-1" />
              <p className="text-xs text-muted-foreground">{entry.comment}</p>
            </div>
          ))}
        </div>
      ) : null}

      {data.redFlags?.length ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Red flags</p>
          {data.redFlags.map((flag, index) => (
            <p key={index} className="text-sm text-muted-foreground">
              <span className="font-mono text-xs">{flag.code}</span> — {flag.detail}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
