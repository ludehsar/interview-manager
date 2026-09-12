import Link from 'next/link'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { JobRowActions } from '@/components/jobs/job-row-actions'
import { RelativeTime } from '@/components/jobs/relative-time'
import { regionTone, stateTone, StatusPill } from '@/components/jobs/status-pill'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { JobState } from '@/lib/actions/jobs'
import { formatEmployment, formatRegion, formatSalary, formatSeniority, formatWorkplace } from '@/lib/format'

export type JobTableRow = {
  id: string
  title: string
  company: string
  companyDomain?: string | null
  locationRaw: string | null
  remoteRegion: string
  workplaceType?: string
  employmentType?: string
  seniority?: string
  salaryMinUsdMonth?: number | null
  salaryMaxUsdMonth?: number | null
  postedAt: Date | null
  applyUrl?: string
  isActive?: boolean
}

export function JobTable({
  jobs,
  states,
  emptyMessage = 'No jobs match these filters yet.',
  showStatus = false,
}: {
  jobs: JobTableRow[]
  states?: Map<string, string>
  emptyMessage?: string
  showStatus?: boolean
}) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-36">Company</TableHead>
            <TableHead className="min-w-40">Job title</TableHead>
            <TableHead className="hidden whitespace-nowrap lg:table-cell">Posted</TableHead>
            <TableHead className="hidden whitespace-nowrap 2xl:table-cell">Type</TableHead>
            <TableHead className="whitespace-nowrap">{showStatus ? 'Status' : 'Region'}</TableHead>
            <TableHead className="w-12 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const salary = formatSalary(job.salaryMinUsdMonth ?? null, job.salaryMaxUsdMonth ?? null)
            const state = states?.get(job.id) ?? null
            return (
              <TableRow key={job.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <CompanyLogo company={job.company} domain={job.companyDomain} />
                    <div className="min-w-0 max-w-36">
                      <p className="truncate font-medium">{job.company}</p>
                      <p className="truncate text-xs text-muted-foreground">{job.locationRaw ?? 'Remote'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[22rem]">
                  <Link href={`/jobs/${job.id}`} className="block truncate font-medium hover:text-primary hover:underline">
                    {job.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {[job.seniority && job.seniority !== 'UNKNOWN' ? formatSeniority(job.seniority) : null, salary]
                      .filter(Boolean)
                      .join(' · ') || 'Remote role'}
                    {job.postedAt ? (
                      <span className="lg:hidden">
                        {' · '}
                        <RelativeTime date={job.postedAt} fallback="" />
                      </span>
                    ) : null}
                  </p>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                  <RelativeTime date={job.postedAt} />
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground 2xl:table-cell">
                  {[
                    job.employmentType && job.employmentType !== 'UNKNOWN' ? formatEmployment(job.employmentType) : null,
                    job.workplaceType && job.workplaceType !== 'UNKNOWN' ? formatWorkplace(job.workplaceType) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </TableCell>
                <TableCell>
                  {showStatus ? (
                    <StatusPill
                      label={state ? state.charAt(0) + state.slice(1).toLowerCase() : 'No status'}
                      tone={stateTone(state)}
                    />
                  ) : (
                    <StatusPill label={formatRegion(job.remoteRegion)} tone={regionTone(job.remoteRegion)} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <JobRowActions
                    jobId={job.id}
                    applyUrl={job.applyUrl ?? `/jobs/${job.id}`}
                    initialState={(state as JobState | null) ?? null}
                    onChanged={showStatus ? 'refresh' : undefined}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
