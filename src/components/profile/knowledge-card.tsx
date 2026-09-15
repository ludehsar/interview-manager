'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { rebuildKnowledge } from '@/lib/actions/knowledge'
import { KnowledgePanel } from './knowledge-panel'

export function KnowledgeCard({
  chunks,
  nodes,
  embedded,
}: {
  chunks: number
  nodes: number
  embedded: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const rebuild = () => {
    startTransition(async () => {
      try {
        const result = await rebuildKnowledge()
        router.refresh()
        toast.success(`Rebuilt ${result.chunks} chunks from ${result.entries} entries`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not rebuild knowledge')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {embedded} of {chunks} chunks embedded
        </p>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={rebuild}>
          <RefreshCw className={pending ? 'size-4 animate-spin' : 'size-4'} />
          {pending ? 'Rebuilding…' : 'Rebuild knowledge'}
        </Button>
      </div>

      <KnowledgePanel chunkCount={chunks} nodeCount={nodes} />
    </div>
  )
}
