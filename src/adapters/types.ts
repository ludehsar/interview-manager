import type { NormalizedJob, ParsedJob, SourceTier } from '@/domain/jobs/types'
import type { HttpClient } from './http'

export type AdapterKind =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workable'
  | 'smartrecruiters'
  | 'workday'
  | 'eightfold'
  | 'amazon'
  | 'remotive'
  | 'wwr'
  | 'himalayas'
  | 'workingnomads'
  | 'arbeitnow'
  | 'jobicy'
  | 'remoteok'
  | 'bdjobs'
  | 'wpjobs'
  | 'successfactors'

export type SourceDefinition = {
  id: string
  kind: AdapterKind
  tier: SourceTier
  identifier: string
  identityKey?: string
  label: string
  companyOverride?: string
  companyDomain?: string
  locationDefault?: string
  countryHint?: string
  intervalMinutes: number
  tags?: string[]
  enabled: boolean
}

export type AdapterContext = {
  http: HttpClient
  now: Date
  maxPages: number
  knownExternalIds?: Set<string>
}

export type Adapter = {
  kind: AdapterKind
  tier: SourceTier
  hosts: string[]
  minGapMs: number
  probeUrl(source: SourceDefinition): string
  fetchRaw(source: SourceDefinition, ctx: AdapterContext): Promise<unknown[]>
  parse(payload: unknown[], source: SourceDefinition): ParsedJob[]
}

export type AdapterResult = {
  source: SourceDefinition
  jobs: NormalizedJob[]
}

export function sourceId(kind: AdapterKind, identifier: string): string {
  return `${kind}:${identifier}`
}
