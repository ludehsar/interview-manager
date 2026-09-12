import type { ReactNode } from 'react'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
        <footer className="border-t border-border px-4 py-5 text-xs text-muted-foreground md:px-6">
          Listings come straight from company applicant tracking systems and curated remote boards.
        </footer>
      </div>
    </div>
  )
}
