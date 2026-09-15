import { z } from 'zod'
import { extractResume, type ExtractResult } from '@/domain/profile/extract'
import { ensureSecrets } from '../secrets'

const eventSchema = z.object({ uploadId: z.string().min(1) })

export const handler = async (event: unknown): Promise<ExtractResult> => {
  await ensureSecrets()
  return extractResume(eventSchema.parse(event))
}
