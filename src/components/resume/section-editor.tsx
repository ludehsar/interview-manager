'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { ResumeDocument } from '@/ai/schemas/resume'
import { setHidden } from '@/domain/resume/edits'
import { rerenderResume, saveResumeSections } from '@/lib/actions/resumes'

export function SectionEditor({ resumeId, initial }: { resumeId: string; initial: ResumeDocument }) {
  const router = useRouter()
  const [doc, setDoc] = useState<ResumeDocument>(initial)
  const [dirty, setDirty] = useState(false)
  const [pending, startTransition] = useTransition()

  const toggle = (target: { sectionId?: string; entryId?: string; bulletId?: string }, hidden: boolean) => {
    setDoc((current) => setHidden(current, target, hidden))
    setDirty(true)
  }

  const save = () => {
    startTransition(async () => {
      try {
        await saveResumeSections(resumeId, doc)
        await rerenderResume(resumeId)
        setDirty(false)
        router.refresh()
        toast.success('Saved and re-rendered')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not save these changes')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Hiding never deletes. The entry stays in the resume JSON, so the AI can never quietly drop your work.
        </p>
        <Button type="button" size="sm" disabled={!dirty || pending} onClick={save}>
          {pending ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? 'Saving…' : 'Save and re-render'}
        </Button>
      </div>

      {doc.sections.map((section) => (
        <div key={section.id} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <p className={section.hidden ? 'font-medium text-muted-foreground line-through' : 'font-medium'}>
              {section.heading}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={section.hidden ? 'Show section' : 'Hide section'}
              onClick={() => toggle({ sectionId: section.id }, !section.hidden)}
            >
              {section.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>

          {section.entries.map((entry) => (
            <div key={entry.id} className="space-y-2 pl-3">
              <div className="flex items-center justify-between gap-3">
                <p className={entry.hidden ? 'text-sm text-muted-foreground line-through' : 'text-sm'}>
                  {[entry.title, entry.organization].filter(Boolean).join(' · ')}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={entry.hidden ? 'Show entry' : 'Hide entry'}
                  onClick={() => toggle({ entryId: entry.id }, !entry.hidden)}
                >
                  {entry.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>

              {entry.bullets.map((bullet) => (
                <div key={bullet.id} className="flex items-start justify-between gap-3 pl-3">
                  <div className="space-y-1">
                    <p className={bullet.hidden ? 'text-sm text-muted-foreground line-through' : 'text-sm'}>
                      {bullet.text}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {bullet.metricStatus.toLowerCase()}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                        {bullet.evidenceNodeIds.length} cited
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={bullet.hidden ? 'Show bullet' : 'Hide bullet'}
                    onClick={() => toggle({ bulletId: bullet.id }, !bullet.hidden)}
                  >
                    {bullet.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              ))}

              <Separator />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
