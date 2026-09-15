import { z } from 'zod'
import { buildKnowledgeGraph, type KgBuildResult } from '@/domain/profile/kg-build'
import { ensureSecrets } from '../secrets'

const eventSchema = z.object({
  userId: z.string().min(1),
  entryIds: z.array(z.string().min(1)).optional(),
})

export const handler = async (event: unknown): Promise<KgBuildResult> => {
  await ensureSecrets()
  return buildKnowledgeGraph(eventSchema.parse(event))
}
