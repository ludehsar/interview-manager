'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, Check, ExternalLink, MoreVertical, Trash2 } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setJobState, type JobState } from '@/lib/actions/jobs'
import { cn } from '@/lib/cn'

const OPTIONS: { value: JobState; label: string }[] = [
  { value: 'SAVED', label: 'Save for later' },
  { value: 'APPLIED', label: 'Mark as applied' },
  { value: 'DISMISSED', label: 'Not interested' },
]

export function JobRowActions({
  jobId,
  applyUrl,
  initialState = null,
  onChanged,
}: {
  jobId: string
  applyUrl: string
  initialState?: JobState | null
  onChanged?: 'refresh'
}) {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<JobState | null>(initialState)
  const [pending, startTransition] = useTransition()

  const apply = (next: JobState | null) => {
    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }
    const previous = state
    setState(next)
    startTransition(async () => {
      try {
        await setJobState(jobId, next)
        if (onChanged === 'refresh') router.refresh()
      } catch {
        setState(previous)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Job actions"
          disabled={pending}
          className={cn('size-8 text-muted-foreground', pending && 'opacity-60')}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Update status</DropdownMenuLabel>
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => apply(option.value)}>
            {option.value === 'SAVED' ? <Bookmark className="size-4" /> : null}
            {option.value === 'APPLIED' ? <Check className="size-4" /> : null}
            {option.value === 'DISMISSED' ? <Trash2 className="size-4" /> : null}
            <span className="flex-1">{option.label}</span>
            {state === option.value ? <Check className="size-3.5 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
        {state ? (
          <DropdownMenuItem onSelect={() => apply(null)}>
            <Trash2 className="size-4" />
            Clear status
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={applyUrl} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink className="size-4" />
            Open original posting
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
