import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AtsReport } from '@/components/resume/ats-report'
import { GuardViolations } from '@/components/resume/guard-violations'
import { PdfPreview } from '@/components/resume/pdf-preview'
import { RunStatus } from '@/components/resume/run-status'
import { ScreenerReport } from '@/components/resume/screener-report'
import { SectionEditor } from '@/components/resume/section-editor'
import { getResumeDetail } from '@/lib/resume-data'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<'/resumes/[id]'>) {
  const { id } = await params
  const userId = await requireUserId()
  const resume = await getResumeDetail(userId, id)
  return { title: resume?.title ?? 'Resume' }
}

export default async function ResumePage({ params }: PageProps<'/resumes/[id]'>) {
  const { id } = await params
  const userId = await requireUserId()
  const resume = await getResumeDetail(userId, id)
  if (!resume) notFound()

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{resume.title}</h1>
          <p className="text-sm text-muted-foreground">
            Prompt {resume.promptVersion} · updated{' '}
            {resume.updatedAt.toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </p>
        </div>
        {resume.run ? (
          <RunStatus
            resumeId={resume.id}
            initial={{
              runId: resume.run.id,
              step: resume.run.step,
              status: resume.run.status,
              error: resume.run.error,
            }}
          />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Card className="gap-0 py-5">
          <CardHeader className="px-5 pb-4">
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <PdfPreview resumeId={resume.id} hasPdf={resume.hasPdf} />
          </CardContent>
        </Card>

        <Card className="gap-0 py-5">
          <CardContent className="px-5">
            <Tabs defaultValue="screener">
              <TabsList>
                <TabsTrigger value="screener">Screener</TabsTrigger>
                <TabsTrigger value="ats">ATS</TabsTrigger>
                <TabsTrigger value="guard">Guard</TabsTrigger>
                <TabsTrigger value="sections">Sections</TabsTrigger>
              </TabsList>

              <TabsContent value="screener" className="pt-4">
                <ScreenerReport score={resume.screenerScore} report={resume.screenerReport} />
              </TabsContent>
              <TabsContent value="ats" className="pt-4">
                <AtsReport score={resume.atsScore} report={resume.atsReport} />
              </TabsContent>
              <TabsContent value="guard" className="pt-4">
                <GuardViolations report={resume.guard} />
              </TabsContent>
              <TabsContent value="sections" className="pt-4">
                <SectionEditor resumeId={resume.id} initial={resume.content} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
