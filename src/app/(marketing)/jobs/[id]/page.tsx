import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Building2, CalendarDays, ExternalLink, MapPin, Wallet } from 'lucide-react'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { JobActions } from '@/components/jobs/job-actions'
import { JobJsonLd } from '@/components/jobs/job-json-ld'
import { regionTone, StatusPill } from '@/components/jobs/status-pill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RelativeTime } from '@/components/jobs/relative-time'
import { formatEmployment, formatRegion, formatSalary, formatSeniority, formatTier } from '@/lib/format'
import { getPublicJob, getRelatedJobs, getStaticJobIds } from '@/lib/jobs-data'

export const revalidate = 3600

export async function generateStaticParams() {
  const ids = await getStaticJobIds(200)
  return ids.map((id) => ({ id }))
}

export async function generateMetadata({ params }: PageProps<'/jobs/[id]'>): Promise<Metadata> {
  const { id } = await params
  const job = await getPublicJob(id)
  if (!job) return { title: 'Job not found' }

  const title = `${job.title} at ${job.company}`
  return {
    title,
    description: job.excerpt ?? `${title}. ${formatRegion(job.remoteRegion)} remote role.`,
    alternates: { canonical: `/jobs/${job.id}` },
    openGraph: { title, description: job.excerpt ?? undefined, type: 'article' },
  }
}

export default async function JobPage({ params }: PageProps<'/jobs/[id]'>) {
  const { id } = await params
  const job = await getPublicJob(id)
  if (!job) notFound()
  if (job.canonicalJobId) permanentRedirect(`/jobs/${job.canonicalJobId}`)
  if (!job.isActive) notFound()

  const related = await getRelatedJobs(job)
  const salary = formatSalary(job.salaryMinUsdMonth, job.salaryMaxUsdMonth)

  const facts: { icon: typeof MapPin; label: string; value: ReactNode }[] = [
    { icon: MapPin, label: 'Location', value: job.locationRaw ?? 'Remote' },
    { icon: Wallet, label: 'Salary', value: salary ?? 'Not listed' },
    { icon: CalendarDays, label: 'Posted', value: <RelativeTime date={job.postedAt} /> },
    { icon: Building2, label: 'Source', value: formatTier(job.tier) },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <JobJsonLd job={job} />

      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/jobs">
          <ArrowLeft className="size-4" />
          Back to jobs
        </Link>
      </Button>

      <Card className="gap-0 py-6">
        <CardContent className="space-y-5 px-6">
          <div className="flex flex-wrap items-start gap-4">
            <CompanyLogo company={job.company} domain={job.companyDomain} className="size-12" />
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">{job.title}</h2>
              <p className="text-muted-foreground">
                {job.company}
                {job.locationRaw ? ` · ${job.locationRaw}` : ''}
              </p>
            </div>
            <StatusPill label={formatRegion(job.remoteRegion)} tone={regionTone(job.remoteRegion)} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {job.seniority !== 'UNKNOWN' ? <Badge variant="secondary">{formatSeniority(job.seniority)}</Badge> : null}
            {job.employmentType !== 'UNKNOWN' ? (
              <Badge variant="secondary">{formatEmployment(job.employmentType)}</Badge>
            ) : null}
            {salary ? <Badge variant="secondary">{salary}</Badge> : null}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => {
              const Icon = fact.icon
              return (
                <div key={fact.label} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{fact.label}</p>
                    <p className="truncate text-sm font-medium">{fact.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer nofollow">
                Apply at {job.company}
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <JobActions jobId={job.id} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="gap-0 py-6">
          <CardHeader className="px-6 pb-4">
            <CardTitle className="text-base">Role description</CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            {job.descriptionText ? (
              <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {job.descriptionText}
              </article>
            ) : (
              <p className="text-sm text-muted-foreground">
                This source did not publish a description. Follow the apply link for the full posting.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {job.skills.length > 0 ? (
            <Card className="gap-0 py-5">
              <CardHeader className="px-5 pb-3">
                <CardTitle className="text-base">Skills mentioned</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5 px-5">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="font-normal">
                    {skill}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {related.length > 0 ? (
            <Card className="gap-0 py-5">
              <CardHeader className="px-5 pb-3">
                <CardTitle className="text-base">More at {job.company}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-5">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/jobs/${item.id}`}
                    className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/60"
                  >
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.locationRaw ?? 'Remote'}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
