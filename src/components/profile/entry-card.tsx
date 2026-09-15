'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { EntryWithBullets } from '@/domain/profile/entries'
import type { EntryKind } from '@/domain/profile/schema'
import { removeEntry, reorderEntryList } from '@/lib/actions/profile'
import { BulletEditor } from './bullet-editor'
import { EntryDialog } from './entry-dialog'

function dateRange(entry: EntryWithBullets): string {
  if (!entry.startDate && !entry.endDate && !entry.isCurrent) return ''
  const end = entry.isCurrent ? 'Present' : (entry.endDate ?? '')
  return [entry.startDate, end].filter(Boolean).join(' — ')
}

export function EntryCard({
  entry,
  kind,
  siblingIds,
}: {
  entry: EntryWithBullets
  kind: EntryKind
  siblingIds: string[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [addingBullet, setAddingBullet] = useState(false)
  const [pending, startTransition] = useTransition()

  const position = siblingIds.indexOf(entry.id)
  const range = dateRange(entry)

  const move = (direction: -1 | 1) => {
    const target = position + direction
    if (target < 0 || target >= siblingIds.length) return
    const next = [...siblingIds]
    next.splice(position, 1)
    next.splice(target, 0, entry.id)

    startTransition(async () => {
      try {
        await reorderEntryList(kind, next)
        router.refresh()
      } catch {
        toast.error('Could not reorder, try again')
      }
    })
  }

  const destroy = () => {
    startTransition(async () => {
      try {
        await removeEntry(entry.id)
        router.refresh()
        toast.success('Entry deleted')
      } catch {
        toast.error('Could not delete the entry, try again')
      }
    })
  }

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 px-5 pb-4">
        <div className="space-y-1">
          <p className="font-medium">{entry.title}</p>
          <p className="text-sm text-muted-foreground">
            {[entry.organization, entry.location, range].filter(Boolean).join(' · ')}
          </p>
          {entry.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {entry.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="font-normal">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Move up"
            disabled={pending || position <= 0}
            onClick={() => move(-1)}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Move down"
            disabled={pending || position < 0 || position >= siblingIds.length - 1}
            onClick={() => move(1)}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Edit entry" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete entry"
            disabled={pending}
            onClick={destroy}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-5">
        {entry.summary ? <p className="text-sm text-muted-foreground">{entry.summary}</p> : null}

        {entry.bullets.map((bullet) => (
          <BulletEditor key={bullet.id} entryId={entry.id} bullet={bullet} />
        ))}

        {addingBullet ? (
          <BulletEditor entryId={entry.id} bullet={null} onDone={() => setAddingBullet(false)} />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setAddingBullet(true)}>
            <Plus className="size-4" />
            Add bullet
          </Button>
        )}
      </CardContent>

      {editing ? <EntryDialog kind={kind} entry={entry} open={editing} onOpenChange={setEditing} /> : null}
    </Card>
  )
}
