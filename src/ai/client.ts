import Anthropic from '@anthropic-ai/sdk'
import type { BetaTextBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
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
  const rate = PRICING_PER_MTOK[model] ?? { input: 0, output: 0 }
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

export type StructuredRequest<S extends z.ZodType> = {
  route: string
  tier: Tier
  schema: S
  stableSystem: string
  cachedContext?: string
  prompt: string
  effort?: Effort
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

export async function generateStructured<S extends z.ZodType>(
  req: StructuredRequest<S>,
): Promise<StructuredResult<z.infer<S>>> {
  const model = MODELS[req.tier]
  const started = Date.now()

  const system: BetaTextBlockParam[] = [
    { type: 'text', text: req.stableSystem, cache_control: { type: 'ephemeral' } },
  ]
  if (req.cachedContext) {
    system.push({ type: 'text', text: req.cachedContext, cache_control: { type: 'ephemeral' } })
  }

  const betas = SUPPORTS_FALLBACK.has(model) ? [FALLBACK_BETA] : undefined
  const fallbacks = SUPPORTS_FALLBACK.has(model) ? ('default' as const) : undefined

  const response = await anthropic().beta.messages.parse({
    model,
    max_tokens: req.maxTokens ?? 16000,
    system,
    messages: [{ role: 'user', content: req.prompt }],
    output_config: {
      effort: req.effort ?? (req.tier === 'reason' ? 'high' : 'medium'),
      format: betaZodOutputFormat(req.schema),
    },
    ...(betas ? { betas } : {}),
    ...(fallbacks ? { fallbacks } : {}),
  })

  if (response.stop_reason === 'refusal') {
    throw new Error(`Model declined request on route ${req.route}`)
  }
  if (response.parsed_output == null) {
    throw new Error(`Model returned unparseable output on route ${req.route}`)
  }

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
    data: response.parsed_output as z.infer<S>,
    model: response.model,
    usage,
    cacheHit: usage.cacheReadTokens > 0,
  }
}
