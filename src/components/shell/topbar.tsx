'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Menu, Search } from 'lucide-react'
import { ClerkLoaded, ClerkLoading, Show, SignInButton, UserButton } from '@clerk/nextjs'
import { Logo } from '@/components/shell/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const TITLES: [string, string][] = [
  ['/dashboard', 'Dashboard'],
  ['/jobs', 'Jobs'],
  ['/saved', 'Saved jobs'],
  ['/profile', 'Profile'],
]

function titleFor(pathname: string): string {
  const match = TITLES.find(([href]) => pathname === href || pathname.startsWith(`${href}/`))
  return match ? match[1] : 'Remote jobs'
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    router.push(trimmed ? `/jobs?q=${encodeURIComponent(trimmed)}&sort=relevance` : '/jobs')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center md:hidden">
          <Logo />
        </Link>

        <h1 className="hidden text-lg font-semibold tracking-tight md:block">{titleFor(pathname)}</h1>

        <form onSubmit={submit} className="ml-auto w-full max-w-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Search jobs"
              aria-label="Search jobs"
              className="rounded-full pl-9"
            />
          </div>
        </form>

        <Button variant="ghost" size="icon" asChild className="shrink-0 text-muted-foreground">
          <Link href="/jobs?days=1" aria-label="Jobs added today">
            <Bell className="size-4" />
          </Link>
        </Button>

        <div className="shrink-0 md:hidden">
          <ClerkLoading>
            <Skeleton className="size-8 rounded-full" />
          </ClerkLoading>
          <ClerkLoaded>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button size="sm">Sign in</Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </ClerkLoaded>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/jobs">
            <Menu className="size-4" />
            Jobs
          </Link>
        </Button>
        <Show when="signed-in">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/saved">Saved</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile">Profile</Link>
          </Button>
        </Show>
      </nav>
    </header>
  )
}
