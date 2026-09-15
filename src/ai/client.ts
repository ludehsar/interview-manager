import Anthropic from '@anthropic-ai/sdk'
import type {
  BetaContentBlockParam,
  BetaTextBlockParam,
} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type * as z from 'zod'
import { db } from '@/db/client'
import { llmCalls } from '@/db/schema'
import { newId } from '@/lib/ids'

export const MODELS = {
  reason: 'claude-opus-5',
  write: 'claude-sonnet-5',
  fast: 'claude-haiku-4-5',
} as const

export type Tier = keyof typeof MODELS
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

const unpricedModels = new Set<string>()

export function rateForModel(model: string): { input: number; output: number } {
  const exact = PRICING_PER_MTOK[model]
  if (exact) return exact

  const undated = model.replace(/-\d{8}$/, '')
  const dropped = PRICING_PER_MTOK[undated]
  if (dropped) return dropped

  if (!unpricedModels.has(model)) {
    unpricedModels.add(model)
    console.warn(`no pricing for model ${model}, cost will be recorded as 0`)
  }
  return { input: 0, output: 0 }
}

const FALLBACK_BETA = 'server-side-fallback-2026-07-01'
const SUPPORTS_FALLBACK = new Set(['claude-opus-5'])

let client: Anthropic | null = null

export function anthropic() {
  if (!client) client = new Anthropic()
  return client
}

export type Usage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  usd: number
}

export function priceUsage(
  model: string,
  usage: {
    input_tokens?: number | null
    output_tokens?: number | null
    cache_read_input_tokens?: number | null
    cache_creation_input_tokens?: number | null
  },
): Usage {
  const rate = rateForModel(model)
  const input = usage.input_tokens ?? 0
  const output = usage.output_tokens ?? 0
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const usd =
    (input * rate.input + cacheRead * rate.input * 0.1 + cacheWrite * rate.input * 1.25 + output * rate.output) / 1e6
  return { inputTokens: input, outputTokens: output, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite, usd }
}

async function recordUsage(args: {
  userId: string | null
  route: string
  model: string
  usage: Usage
  latencyMs: number
}) {
  try {
    await db()
      .insert(llmCalls)
      .values({
        id: newId('llm'),
        userId: args.userId,
        route: args.route,
        model: args.model,
        inputTokens: args.usage.inputTokens,
        outputTokens: args.usage.outputTokens,
        cacheReadTokens: args.usage.cacheReadTokens,
        cacheWriteTokens: args.usage.cacheWriteTokens,
        usd: args.usage.usd,
        latencyMs: args.latencyMs,
      })
  } catch (err) {
    console.error('llm usage log failed', err)
  }
}

export type PromptDocument = { mediaType: 'application/pdf'; data: string; title?: string }

export type StructuredRequest<S extends z.ZodType> = {
  route: string
  tier: Tier
  schema: S
  stableSystem: string
  cachedContext?: string
  documents?: PromptDocument[]
  prompt: string
  effort?: Effort
  cacheTtl?: '5m' | '1h'
  maxTokens?: number
  userId?: string | null
  logUsage?: boolean
}

export type StructuredResult<T> = {
  data: T
  model: string
  usage: Usage
  cacheHit: boolean
}

type Issue = { code: string; origin?: string; maximum?: number | bigint; path: PropertyKey[] }

function container(root: unknown, path: PropertyKey[]): { parent: Record<PropertyKey, unknown>; key: PropertyKey } | null {
  let node: unknown = root
  for (const key of path.slice(0, -1)) {
    if (node == null || typeof node !== 'object') return null
    node = (node as Record<PropertyKey, unknown>)[key]
  }
  const key = path[path.length - 1]
  if (node == null || typeof node !== 'object' || key === undefined) return null
  return { parent: node as Record<PropertyKey, unknown>, key }
}

export function clampOversized(root: unknown, issues: Issue[]): number {
  let clamped = 0

  for (const issue of issues) {
    if (issue.code !== 'too_big' || issue.maximum === undefined) continue
    const target = container(root, issue.path)
    if (!target) continue

    const value = target.parent[target.key]
    const max = Number(issue.maximum)

    if (typeof value === 'string' && value.length > max) {
      target.parent[target.key] = value.slice(0, max)
      clamped += 1
    } else if (Array.isArray(value) && value.length > max) {
      target.parent[target.key] = value.slice(0, max)
      clamped += 1
    }
  }

  return clamped
}

function parseClamped<S extends z.ZodType>(schema: S, raw: unknown, route: string): z.infer<S> {
  const candidate = raw

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = schema.safeParse(candidate)
    if (result.success) {
      if (attempt > 0) console.warn(`clamped oversized fields on route ${route}`)
      return result.data
    }

    const clamped = clampOversized(candidate, result.error.issues as unknown as Issue[])
    if (clamped === 0) throw result.error
  }

  return schema.parse(candidate)
}

export async function generateStructured<S extends z.ZodType>(
  req: StructuredRequest<S>,
): Promise<StructuredResult<z.infer<S>>> {
  const model = MODELS[req.tier]
  const started = Date.now()
  const cacheControl = { type: 'ephemeral' as const, ...(req.cacheTtl ? { ttl: req.cacheTtl } : {}) }

  const system: BetaTextBlockParam[] = [{ type: 'text', text: req.stableSystem, cache_control: cacheControl }]
  if (req.cachedContext) {
    system.push({ type: 'text', text: req.cachedContext, cache_control: cacheControl })
  }

  const content: BetaContentBlockParam[] = [
    ...(req.documents ?? []).map(
      (document): BetaContentBlockParam => ({
        type: 'document',
        source: { type: 'base64', media_type: document.mediaType, data: document.data },
        ...(document.title ? { title: document.title } : {}),
        cache_control: cacheControl,
      }),
    ),
    { type: 'text', text: req.prompt },
  ]

  const betas = SUPPORTS_FALLBACK.has(model) ? [FALLBACK_BETA] : undefined
  const fallbacks = SUPPORTS_FALLBACK.has(model) ? ('default' as const) : undefined
  const effort = req.tier === 'fast' ? undefined : (req.effort ?? (req.tier === 'reason' ? 'high' : 'medium'))

  const response = await anthropic().beta.messages.create({
    model,
    max_tokens: req.maxTokens ?? 16000,
    system,
    messages: [{ role: 'user', content }],
    output_config: {
      ...(effort ? { effort } : {}),
      format: betaZodOutputFormat(req.schema),
    },
    ...(betas ? { betas } : {}),
    ...(fallbacks ? { fallbacks } : {}),
  })

  if (response.stop_reason === 'refusal') {
    throw new Error(`Model declined request on route ${req.route}`)
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Model hit max_tokens before closing its output on route ${req.route}`)
  }

  const text = response.content
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('')

  if (text.trim() === '') {
    throw new Error(`Model returned no output on route ${req.route}`)
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error(`Model returned unparseable output on route ${req.route}`)
  }

  const parsed = parseClamped(req.schema, raw, req.route)

  const usage = priceUsage(response.model, response.usage)
  if (req.logUsage !== false) {
    await recordUsage({
      userId: req.userId ?? null,
      route: req.route,
      model: response.model,
      usage,
      latencyMs: Date.now() - started,
    })
  }

  return {
    data: parsed,
    model: response.model,
    usage,
    cacheHit: usage.cacheReadTokens > 0,
  }
}
