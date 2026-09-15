'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ChunkHit = { id: string; source: string; text: string; score: number }
type NodeHit = { id: string; type: string; label: string; distance: number }

export function KnowledgePanel({ chunkCount, nodeCount }: { chunkCount: number; nodeCount: number }) {
  const [query, setQuery] = useState('')
  const [chunks, setChunks] = useState<ChunkHit[]>([])
  const [nodes, setNodes] = useState<NodeHit[]>([])
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)

  const search = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (query.trim().length < 2) return

    setBusy(true)
    try {
      const response = await fetch('/api/profile/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = (await response.json()) as { chunks?: ChunkHit[]; nodes?: NodeHit[] }
      setChunks(data.chunks ?? [])
      setNodes(data.nodes ?? [])
      setSearched(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {chunkCount} {chunkCount === 1 ? 'chunk' : 'chunks'} and {nodeCount} graph{' '}
        {nodeCount === 1 ? 'node' : 'nodes'} back your resume. Search them the way the resume builder does.
      </p>

      <form onSubmit={search} className="flex items-center gap-2">
        <Input
          value={query}
          placeholder="kubernetes autoscaling"
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" disabled={busy}>
          <Search className="size-4" />
          {busy ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {nodes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {nodes.map((node) => (
            <Badge key={node.id} variant="secondary" className="font-normal">
              {node.type.toLowerCase()}: {node.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {chunks.length > 0 ? (
        <div className="space-y-2">
          {chunks.map((chunk) => (
            <div key={chunk.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3 pb-1">
                <span className="text-xs text-muted-foreground">{chunk.source}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{chunk.score.toFixed(4)}</span>
              </div>
              <p className="whitespace-pre-line text-sm">{chunk.text}</p>
            </div>
          ))}
        </div>
      ) : searched && !busy ? (
        <p className="text-sm text-muted-foreground">
          Nothing matched. Knowledge is built from your entries — add entries, then rebuild.
        </p>
      ) : null}
    </div>
  )
}
