'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { EntryWithBullets } from '@/domain/profile/entries'
import type { EntryKind } from '@/domain/profile/schema'
import { createEntry, saveEntry } from '@/lib/actions/profile'
import { TokenInput } from './token-input'

type Draft = {
  title: string
  organization: string
  location: string
  startDate: string
  endDate: string
  isCurrent: boolean
  skills: string[]
  summary: string
}

function toDraft(entry: EntryWithBullets | null): Draft {
  return {
    title: entry?.title ?? '',
    organization: entry?.organization ?? '',
    location: entry?.location ?? '',
    startDate: entry?.startDate ?? '',
    endDate: entry?.endDate ?? '',
    isCurrent: entry?.isCurrent ?? false,
    skills: entry?.skills ?? [],
    summary: entry?.summary ?? '',
  }
}

const TITLE_LABEL: Record<EntryKind, string> = {
  EXPERIENCE: 'Role title',
  PROJECT: 'Project name',
  EDUCATION: 'Degree',
  CERTIFICATION: 'Certification',
  SKILL_GROUP: 'Group name',
}

const ORG_LABEL: Record<EntryKind, string> = {
  EXPERIENCE: 'Company',
  PROJECT: 'Client or employer',
  EDUCATION: 'Institution',
  CERTIFICATION: 'Issuer',
  SKILL_GROUP: 'Context',
}

export function EntryDialog({
  kind,
  entry,
  open,
  onOpenChange,
}: {
  kind: EntryKind
  entry: EntryWithBullets | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(toDraft(entry))
  const [pending, startTransition] = useTransition()

  const submit = () => {
    if (draft.title.trim() === '') {
      toast.error(`${TITLE_LABEL[kind]} is required`)
      return
    }

    startTransition(async () => {
      try {
        const input = { ...draft, kind }
        if (entry) await saveEntry(entry.id, input)
        else await createEntry(input)
        onOpenChange(false)
        router.refresh()
        toast.success(entry ? 'Entry updated' : 'Entry added')
      } catch {
        toast.error('Could not save the entry, try again')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit entry' : 'Add entry'}</DialogTitle>
          <DialogDescription>
            Everything here stays in your profile. The resume builder decides what to show, and never invents what is
            not written down.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="entry-title">{TITLE_LABEL[kind]}</Label>
              <Input
                id="entry-title"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-organization">{ORG_LABEL[kind]}</Label>
              <Input
                id="entry-organization"
                value={draft.organization}
                onChange={(event) => setDraft((current) => ({ ...current, organization: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-location">Location</Label>
              <Input
                id="entry-location"
                value={draft.location}
                placeholder="Remote, or Dhaka, Bangladesh"
                onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
              />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <Switch
                id="entry-current"
                checked={draft.isCurrent}
                onCheckedChange={(isCurrent) => setDraft((current) => ({ ...current, isCurrent }))}
              />
              <Label htmlFor="entry-current">This is current</Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-start">Start</Label>
              <Input
                id="entry-start"
                value={draft.startDate}
                placeholder="2022-01"
                onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-end">End</Label>
              <Input
                id="entry-end"
                value={draft.endDate}
                placeholder="2024-06"
                disabled={draft.isCurrent}
                onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
          </div>

          <TokenInput
            id="entry-skills"
            label="Skills and tools"
            values={draft.skills}
            placeholder="PostgreSQL, then Enter"
            onChange={(skills) => setDraft((current) => ({ ...current, skills }))}
          />

          <div className="space-y-1.5">
            <Label htmlFor="entry-summary">Summary</Label>
            <Textarea
              id="entry-summary"
              rows={3}
              value={draft.summary}
              placeholder="One or two lines of context. Bullets carry the impact."
              onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? 'Saving…' : entry ? 'Save entry' : 'Add entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
