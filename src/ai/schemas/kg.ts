import { z } from 'zod'

export const KG_NODE_TYPES = [
  'PERSON',
  'ROLE',
  'COMPANY',
  'PROJECT',
  'SKILL',
  'TOOL',
  'ACHIEVEMENT',
  'METRIC',
  'DOMAIN',
  'EDUCATION',
  'CERTIFICATION',
] as const

export const KG_EDGE_TYPES = [
  'HELD_ROLE',
  'AT_COMPANY',
  'USED_SKILL',
  'DELIVERED',
  'MEASURED_BY',
  'IN_DOMAIN',
  'STUDIED_AT',
  'RELATED_TO',
] as const

export const KgExtractionSchema = z.object({
  nodes: z
    .array(
      z.object({
        key: z.string().max(40),
        type: z.enum(KG_NODE_TYPES),
        label: z.string().max(300),
        props: z.object({
          value: z.number().nullable(),
          unit: z.string().max(24).nullable(),
          period: z.string().max(40).nullable(),
          detail: z.string().max(240).nullable(),
        }),
      }),
    )
    .max(120),
  edges: z
    .array(
      z.object({
        source: z.string().max(40),
        target: z.string().max(40),
        type: z.enum(KG_EDGE_TYPES),
      }),
    )
    .max(200),
  chunks: z.array(z.object({ text: z.string().min(40).max(1200) })).max(30),
})

export type KgExtraction = z.infer<typeof KgExtractionSchema>
export type KgNodeType = (typeof KG_NODE_TYPES)[number]
export type KgEdgeType = (typeof KG_EDGE_TYPES)[number]
