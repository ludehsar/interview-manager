import { z } from 'zod'

export const pipelineStateSchema = z.object({
  runId: z.string().min(1),
  userId: z.string().min(1),
  kind: z.enum(['MASTER', 'TAILORED']),
  resumeId: z.string().nullable(),
  jobId: z.string().nullable(),
  uploadId: z.string().nullable(),
  evidenceKey: z.string().nullable(),
  promptVersion: z.string(),
  loop: z.number().int(),
  guardOk: z.boolean(),
  guardErrors: z.number().int(),
  screenerScore: z.number().nullable(),
  atsScore: z.number().nullable(),
  pdfKey: z.string().nullable(),
  typstKey: z.string().nullable(),
})
