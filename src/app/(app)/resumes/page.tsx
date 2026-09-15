import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BuildButton } from '@/components/resume/build-button'
import { RunStatus } from '@/components/resume/run-status'
import { getResumes } from '@/lib/resume-data'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Resumes' }

export default async function ResumesPage() {
  const userId = await requireUserId()
  const { items, run } = await getResumes(userId)
  const master = items.find((item) => item.kind === 'MASTER')

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            One master resume, built from your profile and checked claim by claim.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {run ? (
            <RunStatus
              resumeId={run.resumeId ?? 'latest'}
              initial={{ runId: run.id, step: run.step, status: run.status, error: run.error }}
            />
          ) : null}
          <BuildButton hasMaster={Boolean(master)} />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="gap-0 py-5">
          <CardContent className="space-y-3 px-5">
            <p className="text-sm text-muted-foreground">
              No resume yet. Fill in your profile first, then build the master resume — every bullet it writes has to
              cite something you actually wrote down.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">Go to profile</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="gap-0 py-5">
              <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4 text-primary" />
                  <Link href={`/resumes/${item.id}`} className="hover:underline">
                    {item.title}
                  </Link>
                </CardTitle>
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {item.kind.toLowerCase()}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4 px-5 text-sm text-muted-foreground">
                <span>
                  Screener{' '}
                  <span className="font-medium tabular-nums text-foreground">{item.screenerScore ?? '—'}</span>
                </span>
                <span>
                  ATS <span className="font-medium tabular-nums text-foreground">{item.atsScore ?? '—'}</span>
                </span>
                <span>{item.pdfKey ? 'PDF ready' : 'No PDF yet'}</span>
                <span>Updated {item.updatedAt.toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
