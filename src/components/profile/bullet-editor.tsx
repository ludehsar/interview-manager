'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { EntryBulletRow } from '@/domain/profile/entries'
import { deriveMetricStatus, MIN_DECOMPOSE_CHARS } from '@/domain/profile/xyz'
import { decomposeBulletText, removeBullet, saveBullet } from '@/lib/actions/profile'
import { MetricBadge } from './metric-badge'

type Draft = { text: string; x: string; y: string; z: string }
type Part = 'x' | 'y' | 'z'
type Auto = Record<Part, boolean>

const PARTS: Part[] = ['x', 'y', 'z']
const DECOMPOSE_DELAY_MS = 700

type Form = { draft: Draft; auto: Auto }

function toForm(bullet: EntryBulletRow | null): Form {
  return {
    draft: {
      text: bullet?.text ?? '',
      x: bullet?.x ?? '',
      y: bullet?.y ?? '',
      z: bullet?.z ?? '',
    },
    auto: { x: false, y: false, z: false },
  }
}

function writableParts(draft: Draft, auto: Auto): Part[] {
  return PARTS.filter((part) => draft[part].trim() === '' || auto[part])
}

export function BulletEditor({
  entryId,
  bullet,
  onDone,
}: {
  entryId: string
  bullet: EntryBulletRow | null
  onDone?: () => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(bullet === null)
  const [form, setForm] = useState<Form>(toForm(bullet))
  const [filling, setFilling] = useState(false)
  const [pending, startTransition] = useTransition()
  const lastDecomposed = useRef<string | null>(bullet?.text ?? null)

  const { draft, auto } = form
  const status = deriveMetricStatus(draft)

  const decompose = useCallback(async (text: string, force: boolean) => {
    const trimmed = text.trim()
    if (trimmed.length < MIN_DECOMPOSE_CHARS) return

    setFilling(true)
    try {
      const parts = await decomposeBulletText(trimmed)
      lastDecomposed.current = trimmed
      setForm((current) => {
        if (current.draft.text.trim() !== trimmed) return current

        const fillable = force ? PARTS : writableParts(current.draft, current.auto)
        const next = { draft: { ...current.draft }, auto: { ...current.auto } }
        for (const part of fillable) {
          next.draft[part] = parts[part]
          next.auto[part] = true
        }
        return next
      })
    } catch {
      if (force) toast.error('Could not work out X, Y and Z, fill them in yourself')
    } finally {
      setFilling(false)
    }
  }, [])

  useEffect(() => {
    if (!editing) return
    const text = draft.text.trim()
    if (text.length < MIN_DECOMPOSE_CHARS || lastDecomposed.current === text) return
    if (writableParts(draft, auto).length === 0) return

    const timer = setTimeout(() => void decompose(text, false), DECOMPOSE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [auto, decompose, draft, editing])

  const editText = (text: string) => {
    setForm((current) => ({ ...current, draft: { ...current.draft, text } }))
  }

  const editPart = (part: Part, value: string) => {
    setForm((current) => ({
      draft: { ...current.draft, [part]: value },
      auto: { ...current.auto, [part]: false },
    }))
  }

  const reset = () => {
    setForm(toForm(bullet))
    lastDecomposed.current = bullet?.text ?? null
  }

  const save = () => {
    if (draft.text.trim() === '') {
      toast.error('A bullet needs some text')
      return
    }
    startTransition(async () => {
      try {
        await saveBullet({ id: bullet?.id, entryId, text: draft.text, x: draft.x, y: draft.y, z: draft.z })
        setEditing(false)
        onDone?.()
        router.refresh()
      } catch {
        toast.error('Could not save the bullet, try again')
      }
    })
  }

  const destroy = () => {
    if (!bullet) return
    startTransition(async () => {
      try {
        await removeBullet(bullet.id)
        router.refresh()
      } catch {
        toast.error('Could not delete the bullet, try again')
      }
    })
  }

  if (!editing && bullet) {
    return (
      <div className="group flex items-start justify-between gap-3 rounded-lg border border-border p-3">
        <div className="space-y-1.5">
          <p className="text-sm">{bullet.text}</p>
          <div className="flex flex-wrap items-center gap-2">
            <MetricBadge status={bullet.metricStatus} />
            {bullet.y ? <span className="text-xs text-muted-foreground">Y: {bullet.y}</span> : null}
            {bullet.z ? <span className="text-xs text-muted-foreground">Z: {bullet.z}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Edit bullet" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete bullet"
            disabled={pending}
            onClick={destroy}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <div className="space-y-1.5">
        <Label htmlFor={`text-${bullet?.id ?? 'new'}`}>Bullet</Label>
        <Textarea
          id={`text-${bullet?.id ?? 'new'}`}
          rows={2}
          value={draft.text}
          placeholder="Cut checkout p95 latency from 900 ms to 240 ms by moving session reads to Redis"
          onChange={(event) => editText(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MetricBadge status={status} />
        <span className="text-xs text-muted-foreground">
          {filling
            ? 'Working out X, Y and Z…'
            : status === 'QUANTIFIED'
              ? 'Y carries a hard number'
              : status === 'ESTIMATED'
                ? 'Y carries a hedged number — an exact one scores higher'
                : 'Add a measured result to Y to quantify this bullet'}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto"
          disabled={filling || draft.text.trim().length < MIN_DECOMPOSE_CHARS}
          onClick={() => void decompose(draft.text, true)}
        >
          <Sparkles className="size-4" />
          Redo X, Y and Z
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            { part: 'x' as const, label: 'X — what you did', placeholder: 'Moved session reads to Redis' },
            { part: 'y' as const, label: 'Y — measured by', placeholder: '240 ms p95' },
            { part: 'z' as const, label: 'Z — by doing', placeholder: 'for 1.2M monthly users' },
          ]
        ).map((field) => (
          <div key={field.part} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${field.part}-${bullet?.id ?? 'new'}`}>{field.label}</Label>
              {auto[field.part] ? <span className="text-[11px] text-muted-foreground">auto</span> : null}
            </div>
            <Input
              id={`${field.part}-${bullet?.id ?? 'new'}`}
              value={draft[field.part]}
              placeholder={field.placeholder}
              onChange={(event) => editPart(field.part, event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          <Check className="size-4" />
          {pending ? 'Saving…' : 'Save bullet'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset()
            setEditing(false)
            onDone?.()
          }}
        >
          <X className="size-4" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
