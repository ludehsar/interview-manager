'use client'

import { useEffect, useState, useTransition } from 'react'
import { useAuth, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { setJobState, type JobState } from '@/lib/actions/jobs'

export function JobActions({ jobId }: { jobId: string }) {
  const { isLoaded, isSignedIn } = useAuth()
  const [state, setState] = useState<JobState | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    fetch(`/api/jobs/${jobId}/state`)
      .then((response) => (response.ok ? response.json() : { state: null }))
      .then((data: { state: JobState | null }) => {
        if (!cancelled) setState(data.state)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [isSignedIn, jobId])

  if (!isLoaded) return <div className="h-9" />

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button variant="outline">Save this job</Button>
      </SignInButton>
    )
  }

  const apply = (next: JobState) => {
    const target = state === next ? null : next
    const previous = state
    setState(target)
    setError(null)
    startTransition(async () => {
      try {
        await setJobState(jobId, target)
      } catch {
        setState(previous)
        setError('Could not save, try again')
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant={state === 'SAVED' ? 'default' : 'outline'} disabled={pending} onClick={() => apply('SAVED')}>
        {state === 'SAVED' ? 'Saved' : 'Save'}
      </Button>
      <Button variant={state === 'APPLIED' ? 'default' : 'outline'} disabled={pending} onClick={() => apply('APPLIED')}>
        {state === 'APPLIED' ? 'Applied' : 'Mark applied'}
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => apply('DISMISSED')}>
        {state === 'DISMISSED' ? 'Dismissed' : 'Dismiss'}
      </Button>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  )
}
