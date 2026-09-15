import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { GuardReport } from '@/domain/resume/guard'

export function GuardViolations({ report }: { report: GuardReport | null }) {
  if (!report) {
    return <p className="text-sm text-muted-foreground">The guard runs once a draft exists.</p>
  }

  if (report.violations.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="size-4" />
        Every claim traces to evidence in your profile.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={report.errors > 0 ? 'border-destructive/40 text-destructive' : ''}>
          {report.errors} {report.errors === 1 ? 'error' : 'errors'}
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          {report.warnings} {report.warnings === 1 ? 'warning' : 'warnings'}
        </Badge>
      </div>

      <ul className="space-y-2">
        {report.violations.map((violation, index) => (
          <li key={index} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <Badge
                variant="outline"
                className={
                  violation.severity === 'error'
                    ? 'border-destructive/40 font-mono text-xs text-destructive'
                    : 'font-mono text-xs text-muted-foreground'
                }
              >
                {violation.code}
              </Badge>
            </div>
            <p className="text-sm">{violation.message}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
