'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { MAX_UPLOAD_BYTES } from '@/domain/profile/upload-limits'
import { confirmUpload } from '@/lib/actions/uploads'

type Stage = 'idle' | 'presigning' | 'uploading' | 'extracting'

const STAGE_LABEL: Record<Stage, string> = {
  idle: '',
  presigning: 'Preparing the upload',
  uploading: 'Uploading your resume',
  extracting: 'Reading it with the extractor',
}

const STAGE_PROGRESS: Record<Stage, number> = { idle: 0, presigning: 15, uploading: 55, extracting: 85 }

export function ResumeUpload() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const upload = async (file: File) => {
    setError(null)

    if (file.type !== 'application/pdf') {
      setError('Only PDF resumes are supported right now.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That file is larger than 10 MB.')
      return
    }

    try {
      setStage('presigning')
      const presign = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, bytes: file.size }),
      })
      if (!presign.ok) throw new Error((await presign.json().catch(() => ({}))).error ?? 'Could not start the upload')
      const { uploadId, url } = (await presign.json()) as { uploadId: string; url: string }

      setStage('uploading')
      const put = await fetch(url, { method: 'PUT', headers: { 'content-type': file.type }, body: file })
      if (!put.ok) throw new Error('The file could not be stored')

      setStage('extracting')
      startTransition(async () => {
        try {
          await confirmUpload(uploadId)
          router.refresh()
          toast.success('Resume uploaded')
        } catch {
          setError('The upload landed but extraction could not start.')
        } finally {
          setStage('idle')
          if (input.current) input.current.value = ''
        }
      })
    } catch (err) {
      setStage('idle')
      setError(err instanceof Error ? err.message : 'Something went wrong during the upload')
    }
  }

  const busy = stage !== 'idle' || pending

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
          }}
        />
        <Button type="button" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          {busy ? STAGE_LABEL[stage] || 'Working…' : 'Upload a resume PDF'}
        </Button>
        <p className="text-sm text-muted-foreground">PDF only, up to 10 MB. Nothing is published anywhere.</p>
      </div>

      {busy ? <Progress value={STAGE_PROGRESS[stage]} className="h-1.5" /> : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
