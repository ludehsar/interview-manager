'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, Briefcase, LayoutGrid, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react'
import { ClerkLoaded, ClerkLoading, Show, SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { Logo } from '@/components/shell/logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutGrid
  requiresAuth?: boolean
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutGrid, requiresAuth: true }],
  },
  {
    label: 'Job board',
    items: [
      { label: 'Jobs', href: '/jobs', icon: Briefcase },
      { label: 'Saved', href: '/saved', icon: Bookmark, requiresAuth: true },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Profile', href: '/profile', icon: UserRound, requiresAuth: true }],
  },
]

const STORAGE_KEY = 'sidebar:collapsed'

function toggleSidebar() {
  const root = document.documentElement
  const collapsed = root.getAttribute('data-sidebar') === 'collapsed'
  if (collapsed) root.removeAttribute('data-sidebar')
  else root.setAttribute('data-sidebar', 'collapsed')
  try {
    window.localStorage.setItem(STORAGE_KEY, String(!collapsed))
  } catch {
    return
  }
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'sidebar-row relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent font-medium text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      {active ? <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-primary" /> : null}
      <Icon className="size-4 shrink-0" />
      <span className="sidebar-label truncate">{item.label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()

  return (
    <aside className="sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex">
      <div className="sidebar-row flex items-center gap-2 px-4 py-5">
        <Link href="/" className="flex items-center">
          <span className="sidebar-label">
            <Logo />
          </span>
          <span className="hidden [html[data-sidebar='collapsed']_&]:block">
            <Logo collapsed />
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="ml-auto size-7 shrink-0 text-muted-foreground [html[data-sidebar='collapsed']_&]:ml-0"
        >
          <PanelLeftClose className="sidebar-icon-collapse size-4" />
          <PanelLeftOpen className="sidebar-icon-expand size-4" />
        </Button>
      </div>

      <div className="mx-4 border-t border-border" />

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {GROUPS.map((group) => {
          const body = (
            <div className="space-y-1">
              <p className="sidebar-label px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const link = <NavLink key={item.href} item={item} active={active} />
                if (!item.requiresAuth) return link
                return (
                  <Show key={item.href} when="signed-in">
                    {link}
                  </Show>
                )
              })}
            </div>
          )

          if (group.items.every((item) => item.requiresAuth)) {
            return (
              <Show key={group.label} when="signed-in">
                {body}
              </Show>
            )
          }
          return <div key={group.label}>{body}</div>
        })}
      </nav>

      <div className="mt-auto border-t border-border p-3">
        <ClerkLoading>
          <Skeleton className="h-11 w-full" />
        </ClerkLoading>
        <ClerkLoaded>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button className="w-full" size="sm">
                <UserRound className="size-4 shrink-0" />
                <span className="sidebar-label">Sign in</span>
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="sidebar-row flex items-center gap-3 rounded-lg p-1">
              <UserButton />
              <div className="sidebar-label min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.fullName ?? 'Your account'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress ?? ''}
                </p>
              </div>
            </div>
          </Show>
        </ClerkLoaded>
      </div>
    </aside>
  )
}
