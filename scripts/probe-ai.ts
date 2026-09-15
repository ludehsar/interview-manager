import { config } from 'dotenv'
import { z } from 'zod'
import { generateStructured, MODELS, type Tier } from '@/ai/client'
import { closeDatabase } from '@/db/client'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

const ProbeSchema = z.object({ ok: z.boolean(), word: z.string().max(20) })

async function probe(tier: Tier) {
  const started = Date.now()
  const result = await generateStructured({
    route: `probe.${tier}`,
    tier,
    schema: ProbeSchema,
    stableSystem: 'You answer probes. Always set ok to true and word to the single word "pong".',
    prompt: 'ping',
    maxTokens: 256,
    logUsage: false,
  })
  console.log(
    `ok  ${tier.padEnd(8)} ${result.model.padEnd(26)} ${JSON.stringify(result.data)} ` +
      `in=${result.usage.inputTokens} out=${result.usage.outputTokens} usd=${result.usage.usd.toFixed(6)} ` +
      `${Date.now() - started}ms`,
  )
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  const tiers = (process.argv.slice(2).filter((arg) => !arg.startsWith('-')) as Tier[]).filter((tier) => tier in MODELS)
  for (const tier of tiers.length > 0 ? tiers : (['fast'] as Tier[])) {
    await probe(tier)
  }
  await closeDatabase()
}

main().catch(async (err) => {
  await closeDatabase().catch(() => {})
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
