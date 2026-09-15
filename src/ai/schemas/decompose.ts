import { z } from 'zod'

export const DecomposeBulletSchema = z.object({
  x: z.string().max(200).nullable(),
  y: z.string().max(200).nullable(),
  z: z.string().max(200).nullable(),
})

export type DecomposeBullet = z.infer<typeof DecomposeBulletSchema>
