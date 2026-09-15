'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { ExtractedResume } from '@/ai/schemas/resume-extract'
import type { UploadStatus } from '@/domain/profile/upload-limits'
import { acceptUpload, removeUpload } from '@/lib/actions/uploads'

const STATUS_COPY: Record<UploadStatus, string> = {
  PENDING: 'Waiting for the file to finish uploading.',
  EXTRACTING: 'Reading the document. This page updates when it finishes.',
  EXTRACTED: 'Review what was found, then choose what to keep.',
  ACCEPTED: 'Already imported into your profile.',
  FAILED: 'Extraction failed.',
}

export function ExtractionReview({
  uploadId,
  fileName,
  status,
  error,
  extracted,
}: {
  uploadId: string
  fileName: string
  status: UploadStatus
  error: string | null
  extracted: ExtractedResume | null
}) {
  const router = useRouter()
  const entries = extracted?.entries ?? []
  const [selected, setSelected] = useState<number[]>(entries.map((_, index) => index))
  const [pending, startTransition] = useTransition()

  const accept = () => {
    if (selected.length === 0) {
      toast.error('Pick at least one entry to import')
      return
    }
    startTransition(async () => {
      try {
        const result = await acceptUpload(uploadId, selected)
        router.refresh()
        const entries = `Imported ${result.created} ${result.created === 1 ? 'entry' : 'entries'}`
        toast.success(
          result.basicsFilled.length > 0 ? `${entries}, and filled in your contact details` : entries,
        )
      } catch {
        toast.error('Could not import these entries, try again')
      }
    })
  }

  const discard = () => {
    startTransition(async () => {
      try {
        await removeUpload(uploadId)
        router.refresh()
      } catch {
        toast.error('Could not discard this upload, try again')
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">{fileName}</p>
          <p className="text-sm text-muted-foreground">{STATUS_COPY[status]}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal">
            {status.toLowerCase()}
          </Badge>
          <Button type="button" variant="ghost" size="icon" aria-label="Discard upload" disabled={pending} onClick={discard}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {status === 'FAILED' && error ? (
        <Alert variant="destructive">
          <AlertTitle>Extraction failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {extracted && extracted.warnings.length > 0 ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Worth a look</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {extracted.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {status === 'EXTRACTED' && entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={index} className="flex gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id={`entry-${uploadId}-${index}`}
                checked={selected.includes(index)}
                onCheckedChange={(checked) =>
                  setSelected((current) =>
                    checked ? [...current, index].sort((a, b) => a - b) : current.filter((value) => value !== index),
                  )
                }
              />
              <div className="space-y-1.5">
                <Label htmlFor={`entry-${uploadId}-${index}`} className="font-medium">
                  {entry.title}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {[entry.organization, entry.kind.toLowerCase().replace(/_/g, ' '), entry.startDate]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {entry.bullets.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {entry.bullets.map((bullet, position) => (
                      <li key={position}>{bullet.text}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ))}

          <Button type="button" disabled={pending} onClick={accept}>
            {pending ? 'Importing…' : `Import ${selected.length} of ${entries.length}`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
