'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buildMasterResume } from '@/lib/actions/resumes'

export function BuildButton({ hasMaster }: { hasMaster: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const build = () => {
    startTransition(async () => {
      try {
        const { started } = await buildMasterResume()
        router.refresh()
        if (started) toast.success('Build started')
        else toast.error('No resume pipeline is configured. Run pnpm resume:build to drive this locally.')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not start the build')
      }
    })
  }

  return (
    <Button type="button" disabled={pending} onClick={build}>
      <Sparkles className="size-4" />
      {pending ? 'Starting…' : hasMaster ? 'Rebuild master resume' : 'Build master resume'}
    </Button>
  )
}
