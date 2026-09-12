import { companyHue, companyInitials } from '@/domain/jobs/company'
import { cn } from '@/lib/cn'

export function CompanyLogo({
  company,
  domain,
  className,
}: {
  company: string
  domain?: string | null
  className?: string
}) {
  const shell = cn(
    'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-xs font-semibold',
    className,
  )

  if (!domain) {
    const hue = companyHue(company)
    return (
      <span
        className={shell}
        style={{ backgroundColor: `oklch(0.95 0.045 ${hue})`, color: `oklch(0.42 0.15 ${hue})` }}
        aria-hidden
      >
        {companyInitials(company)}
      </span>
    )
  }

  const src = `/api/company-logo?domain=${encodeURIComponent(domain)}&name=${encodeURIComponent(company)}`

  return (
    <span className={shell}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={36} height={36} loading="lazy" decoding="async" className="size-full object-cover" />
    </span>
  )
}
