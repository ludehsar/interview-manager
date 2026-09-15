'use client'

import { Download, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PdfPreview({ resumeId, hasPdf }: { resumeId: string; hasPdf: boolean }) {
  if (!hasPdf) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-center">
        <FileWarning className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No PDF yet. Build the resume to render one.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <iframe
        title="Resume preview"
        src={`/api/resumes/${resumeId}/pdf`}
        className="h-[720px] w-full rounded-lg border border-border bg-surface"
      />
      <Button asChild variant="outline" size="sm">
        <a href={`/api/resumes/${resumeId}/pdf`} target="_blank" rel="noreferrer">
          <Download className="size-4" />
          Open the PDF
        </a>
      </Button>
    </div>
  )
}
