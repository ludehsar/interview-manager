import Link from 'next/link'
import { ArrowRight, Building2, Globe2, Sparkles } from 'lucide-react'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { StatCard } from '@/components/shell/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getBoardStats, getTopCompanies } from '@/lib/jobs-data'

const REGIONS = [
  { label: 'Remote worldwide', href: '/jobs?region=WORLDWIDE' },
  { label: 'Remote APAC', href: '/jobs?region=APAC' },
  { label: 'Bangladesh', href: '/jobs?region=BANGLADESH' },
]

export default async function Home() {
  const [board, companies] = await Promise.all([getBoardStats(), getTopCompanies(8)])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="space-y-6 bg-gradient-to-br from-primary/10 via-transparent to-[oklch(0.85_0.09_195)]/15 px-6 py-12 md:px-10 md:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            {board.activeJobs.toLocaleString('en-US')} live roles from {board.companies.toLocaleString('en-US')} companies
          </span>

          <div className="max-w-2xl space-y-4">
            <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">Remote jobs, straight from the source</h2>
            <p className="text-muted-foreground">
              Listings pulled directly from company applicant tracking systems, so they appear before the aggregators
              have them. Build one master resume, then tailor it to any role with evidence drawn from your own
              experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/jobs">
                Browse all jobs
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {REGIONS.map((region) => (
              <Button key={region.href} variant="outline" asChild>
                <Link href={region.href}>{region.label}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Live jobs"
          value={board.activeJobs.toLocaleString('en-US')}
          icon={Sparkles}
          delta={{ value: board.addedThisWeek, label: 'first seen in the last 7 days' }}
        />
        <StatCard
          label="Companies hiring"
          value={board.companies.toLocaleString('en-US')}
          icon={Building2}
          hint="Each one posts to its own applicant tracking system"
        />
        <StatCard
          label="Open worldwide"
          value={board.worldwide.toLocaleString('en-US')}
          icon={Globe2}
          hint="No country restriction in the posting"
        />
      </div>

      <Card className="gap-0 py-5">
        <CardContent className="space-y-4 px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">Companies with the most openings</h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/jobs">
                See all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map((company) => (
              <Link
                key={company.company}
                href={`/jobs?company=${encodeURIComponent(company.company)}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <CompanyLogo company={company.company} domain={company.company_domain} className="size-8" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{company.company}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{company.openings}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
