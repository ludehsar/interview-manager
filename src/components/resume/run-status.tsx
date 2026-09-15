'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Run = {
  runId: string
  step: string
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  error: string | null
}

const POLL_MS = 2500

const STEP_LABEL: Record<string, string> = {
  queued: 'Queued',
  extract: 'Reading your upload',
  'kg-build': 'Building the knowledge graph',
  draft: 'Drafting',
  guard: 'Checking every claim',
  screen: 'Screening',
  revise: 'Revising',
  render: 'Rendering the PDF',
  'ats-score': 'Parsing the PDF back',
  persist: 'Finishing',
}

export function RunStatus({ resumeId, initial }: { resumeId: string; initial: Run | null }) {
  const router = useRouter()
  const [run, setRun] = useState<Run | null>(initial)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!run || run.status !== 'RUNNING') return

    let cancelled = false

    const poll = async () => {
      try {
        const response = await fetch(`/api/resumes/${resumeId}/run`, { cache: 'no-store' })
        const data = (await response.json()) as { run: Run | null }
        if (cancelled) return

        setRun(data.run)
        if (data.run && data.run.status !== 'RUNNING') {
          router.refresh()
          return
        }
      } catch {
        if (cancelled) return
      }
      timer.current = setTimeout(poll, POLL_MS)
    }

    timer.current = setTimeout(poll, POLL_MS)

    return () => {
      cancelled = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [resumeId, run, router])

  if (!run) return null

  if (run.status === 'RUNNING') {
    return (
      <Badge variant="outline" className="gap-1.5 font-normal">
        <Loader2 className="size-3.5 animate-spin" />
        {STEP_LABEL[run.step] ?? run.step}
      </Badge>
    )
  }

  if (run.status === 'FAILED') {
    return (
      <Badge variant="outline" className="gap-1.5 border-destructive/40 font-normal text-destructive">
        <XCircle className="size-3.5" />
        {run.error ? run.error.slice(0, 80) : 'Build failed'}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5 border-success/40 font-normal text-success">
      <CheckCircle2 className="size-3.5" />
      Up to date
    </Badge>
  )
}
