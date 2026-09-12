import type { JobRow } from '@/domain/jobs/types'

export function JobJsonLd({ job }: { job: JobRow }) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.descriptionText ?? job.excerpt ?? job.title,
    identifier: { '@type': 'PropertyValue', name: job.company, value: job.externalId },
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      ...(job.companyDomain ? { sameAs: `https://${job.companyDomain}` } : {}),
    },
    jobLocationType: 'TELECOMMUTE',
    directApply: job.tier === 'A',
    ...(job.postedAt ? { datePosted: job.postedAt.toISOString() } : {}),
    ...(job.employmentType !== 'UNKNOWN' ? { employmentType: job.employmentType } : {}),
    ...(job.countries.length > 0
      ? {
          applicantLocationRequirements: job.countries.map((code) => ({ '@type': 'Country', name: code })),
        }
      : {}),
    ...(job.salaryMinUsdMonth
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            value: {
              '@type': 'QuantitativeValue',
              minValue: job.salaryMinUsdMonth,
              maxValue: job.salaryMaxUsdMonth ?? job.salaryMinUsdMonth,
              unitText: 'MONTH',
            },
          },
        }
      : {}),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
