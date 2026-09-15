'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { EntryWithBullets } from '@/domain/profile/entries'
import type { EntryKind } from '@/domain/profile/schema'
import { EntryCard } from './entry-card'
import { EntryDialog } from './entry-dialog'

export function EntryList({
  kind,
  entries,
  emptyHint,
  addLabel,
}: {
  kind: EntryKind
  entries: EntryWithBullets[]
  emptyHint: string
  addLabel: string
}) {
  const [adding, setAdding] = useState(false)
  const siblingIds = entries.map((entry) => entry.id)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card className="gap-0 py-5">
          <CardContent className="px-5">
            <p className="text-sm text-muted-foreground">{emptyHint}</p>
          </CardContent>
        </Card>
      ) : (
        entries.map((entry) => <EntryCard key={entry.id} entry={entry} kind={kind} siblingIds={siblingIds} />)
      )}

      {adding ? <EntryDialog kind={kind} entry={null} open={adding} onOpenChange={setAdding} /> : null}
    </div>
  )
}
