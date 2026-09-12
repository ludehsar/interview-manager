import type { AdapterKind, SourceDefinition } from './types'
import { sourceId } from './types'

type SourceSeed = {
  kind: AdapterKind
  identifier: string
  label: string
  companyDomain?: string
  tags?: string[]
  enabled?: boolean
}

const TIER_BY_KIND: Record<AdapterKind, SourceDefinition['tier']> = {
  greenhouse: 'A',
  lever: 'A',
  ashby: 'A',
  workable: 'A',
  smartrecruiters: 'A',
  workday: 'A',
  eightfold: 'A',
  amazon: 'A',
  remotive: 'B',
  wwr: 'B',
  himalayas: 'B',
  workingnomads: 'B',
  arbeitnow: 'C',
  jobicy: 'C',
  remoteok: 'C',
}

const INTERVAL_BY_TIER: Record<SourceDefinition['tier'], number> = {
  A: 60,
  B: 360,
  C: 360,
}

const SEEDS: SourceSeed[] = [
  { kind: 'greenhouse', identifier: 'stripe', label: 'Stripe', companyDomain: 'stripe.com' },
  { kind: 'greenhouse', identifier: 'gitlab', label: 'GitLab', companyDomain: 'gitlab.com', tags: ['remote-first'] },
  { kind: 'greenhouse', identifier: 'cloudflare', label: 'Cloudflare', companyDomain: 'cloudflare.com' },
  { kind: 'greenhouse', identifier: 'databricks', label: 'Databricks', companyDomain: 'databricks.com' },
  { kind: 'greenhouse', identifier: 'elastic', label: 'Elastic', companyDomain: 'elastic.co', tags: ['remote-first'] },
  { kind: 'greenhouse', identifier: 'mongodb', label: 'MongoDB', companyDomain: 'mongodb.com' },
  { kind: 'greenhouse', identifier: 'reddit', label: 'Reddit', companyDomain: 'reddit.com' },
  { kind: 'greenhouse', identifier: 'twilio', label: 'Twilio', companyDomain: 'twilio.com' },
  { kind: 'greenhouse', identifier: 'discord', label: 'Discord', companyDomain: 'discord.com' },
  { kind: 'greenhouse', identifier: 'duolingo', label: 'Duolingo', companyDomain: 'duolingo.com' },
  { kind: 'greenhouse', identifier: 'coinbase', label: 'Coinbase', companyDomain: 'coinbase.com' },
  { kind: 'greenhouse', identifier: 'anthropic', label: 'Anthropic', companyDomain: 'anthropic.com' },
  { kind: 'greenhouse', identifier: 'figma', label: 'Figma', companyDomain: 'figma.com' },
  { kind: 'greenhouse', identifier: 'affirm', label: 'Affirm', companyDomain: 'affirm.com' },
  { kind: 'greenhouse', identifier: 'asana', label: 'Asana', companyDomain: 'asana.com' },

  { kind: 'lever', identifier: 'palantir', label: 'Palantir', companyDomain: 'palantir.com' },
  { kind: 'lever', identifier: 'spotify', label: 'Spotify', companyDomain: 'spotify.com' },
  { kind: 'lever', identifier: 'matchgroup', label: 'Match Group', companyDomain: 'mtch.com' },
  { kind: 'lever', identifier: 'shieldai', label: 'Shield AI', companyDomain: 'shield.ai' },
  { kind: 'lever', identifier: 'ro', label: 'Ro', companyDomain: 'ro.co' },
  { kind: 'lever', identifier: 'tala', label: 'Tala', companyDomain: 'tala.co' },
  { kind: 'lever', identifier: 'mistral', label: 'Mistral AI', companyDomain: 'mistral.ai' },

  { kind: 'ashby', identifier: 'linear', label: 'Linear', companyDomain: 'linear.app', tags: ['remote-first'] },
  { kind: 'ashby', identifier: 'ramp', label: 'Ramp', companyDomain: 'ramp.com' },
  { kind: 'ashby', identifier: 'vanta', label: 'Vanta', companyDomain: 'vanta.com' },
  { kind: 'ashby', identifier: 'posthog', label: 'PostHog', companyDomain: 'posthog.com', tags: ['remote-first'] },
  { kind: 'ashby', identifier: 'replit', label: 'Replit', companyDomain: 'replit.com' },
  { kind: 'ashby', identifier: 'openai', label: 'OpenAI', companyDomain: 'openai.com' },
  { kind: 'ashby', identifier: 'deel', label: 'Deel', companyDomain: 'deel.com', tags: ['remote-first'] },
  { kind: 'ashby', identifier: 'clerk', label: 'Clerk', companyDomain: 'clerk.com' },
  { kind: 'ashby', identifier: 'supabase', label: 'Supabase', companyDomain: 'supabase.com', tags: ['remote-first'] },
  { kind: 'ashby', identifier: 'neon', label: 'Neon', companyDomain: 'neon.tech', tags: ['remote-first'] },

  { kind: 'smartrecruiters', identifier: 'Ubisoft2', label: 'Ubisoft', companyDomain: 'ubisoft.com' },
  { kind: 'smartrecruiters', identifier: 'BoschGroup', label: 'Bosch', companyDomain: 'bosch.com' },

  {
    kind: 'workable',
    identifier: 'brainstation-23',
    label: 'Brain Station 23',
    companyDomain: 'brainstation-23.com',
    tags: ['bangladesh'],
  },
  { kind: 'workable', identifier: 'vivasoft', label: 'Vivasoft', companyDomain: 'vivasoftltd.com', tags: ['bangladesh'] },
  { kind: 'workable', identifier: 'welldev', label: 'WellDev', companyDomain: 'welldev.io', tags: ['bangladesh'] },
  { kind: 'workable', identifier: 'selise', label: 'SELISE', companyDomain: 'selise.ch', tags: ['bangladesh'] },
  {
    kind: 'workable',
    identifier: 'enosis-solutions',
    label: 'Enosis Solutions',
    companyDomain: 'enosisbd.com',
    tags: ['bangladesh'],
  },

  { kind: 'amazon', identifier: 'all', label: 'Amazon', companyDomain: 'amazon.com' },

  {
    kind: 'workday',
    identifier: 'nvidia|wd5|NVIDIAExternalCareerSite',
    label: 'NVIDIA',
    companyDomain: 'nvidia.com',
  },
  {
    kind: 'workday',
    identifier: 'salesforce|wd12|External_Career_Site',
    label: 'Salesforce',
    companyDomain: 'salesforce.com',
  },
  { kind: 'workday', identifier: 'adobe|wd5|external_experienced', label: 'Adobe', companyDomain: 'adobe.com' },
  { kind: 'workday', identifier: 'hpe|wd5|Jobsathpe', label: 'HPE', companyDomain: 'hpe.com' },
  { kind: 'workday', identifier: 'paypal|wd1|jobs', label: 'PayPal', companyDomain: 'paypal.com' },
  { kind: 'workday', identifier: 'workday|wd5|Workday', label: 'Workday', companyDomain: 'workday.com' },

  {
    kind: 'eightfold',
    identifier: 'explore.jobs.netflix.net|netflix.com',
    label: 'Netflix',
    companyDomain: 'netflix.com',
  },

  { kind: 'remotive', identifier: 'all', label: 'Remotive' },
  { kind: 'himalayas', identifier: 'all', label: 'Himalayas' },
  { kind: 'workingnomads', identifier: 'all', label: 'Working Nomads' },
  { kind: 'wwr', identifier: 'remote-programming-jobs', label: 'We Work Remotely Programming' },
  { kind: 'wwr', identifier: 'remote-devops-sysadmin-jobs', label: 'We Work Remotely DevOps' },
  { kind: 'wwr', identifier: 'remote-design-jobs', label: 'We Work Remotely Design' },
  { kind: 'wwr', identifier: 'remote-product-jobs', label: 'We Work Remotely Product' },
  { kind: 'arbeitnow', identifier: 'all', label: 'Arbeitnow' },
  { kind: 'jobicy', identifier: 'all', label: 'Jobicy' },
  { kind: 'remoteok', identifier: 'all', label: 'RemoteOK' },
]


export const SOURCES: SourceDefinition[] = SEEDS.map((seed) => {
  const tier = TIER_BY_KIND[seed.kind]
  return {
    id: sourceId(seed.kind, seed.identifier),
    kind: seed.kind,
    tier,
    identifier: seed.identifier,
    label: seed.label,
    companyOverride: tier === 'A' ? seed.label : undefined,
    companyDomain: seed.companyDomain,
    intervalMinutes: INTERVAL_BY_TIER[tier],
    tags: seed.tags,
    enabled: seed.enabled ?? true,
  }
})

export function findSource(id: string): SourceDefinition | undefined {
  return SOURCES.find((source) => source.id === id)
}

export function enabledSources(filter?: { tier?: SourceDefinition['tier']; kind?: AdapterKind; ids?: string[] }) {
  return SOURCES.filter((source) => {
    if (!source.enabled) return false
    if (filter?.tier && source.tier !== filter.tier) return false
    if (filter?.kind && source.kind !== filter.kind) return false
    if (filter?.ids?.length && !filter.ids.includes(source.id)) return false
    return true
  })
}
