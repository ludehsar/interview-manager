import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'

const REGIONS = [
  { label: 'Remote worldwide', href: '/jobs?region=WORLDWIDE' },
  { label: 'Remote APAC', href: '/jobs?region=APAC' },
  { label: 'Bangladesh', href: '/jobs?region=BANGLADESH' },
]

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <span className="font-semibold">Remote Jobs &amp; AI Resumes</span>
        <div className="flex items-center gap-3 text-sm">
          <Show when="signed-out">
            <SignInButton mode="modal" />
          </Show>
          <Show when="signed-in">
            <Link href="/profile" className="hover:underline">
              Profile
            </Link>
            <UserButton />
          </Show>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-20">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">Remote jobs, straight from the source</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Listings pulled directly from company applicant tracking systems, so they appear before the aggregators
            have them. Build one master resume, then tailor it to any role with evidence drawn from your own
            experience.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {REGIONS.map((region) => (
            <Link
              key={region.href}
              href={region.href}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {region.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
