import { amazonAdapter } from './amazon'
import { arbeitnowAdapter } from './arbeitnow'
import { bdjobsAdapter } from './bdjobs'
import { ashbyAdapter } from './ashby'
import { eightfoldAdapter } from './eightfold'
import { greenhouseAdapter } from './greenhouse'
import { himalayasAdapter } from './himalayas'
import { jobicyAdapter } from './jobicy'
import { leverAdapter } from './lever'
import { remoteOkAdapter } from './remoteok'
import { remotiveAdapter } from './remotive'
import { smartRecruitersAdapter } from './smartrecruiters'
import { successFactorsAdapter } from './successfactors'
import { workableAdapter } from './workable'
import { workdayAdapter } from './workday'
import { workingNomadsAdapter } from './workingnomads'
import { wpJobsAdapter } from './wpjobs'
import { wwrAdapter } from './wwr'
import type { Adapter, AdapterKind } from './types'

export const ADAPTERS: Record<AdapterKind, Adapter> = {
  greenhouse: greenhouseAdapter,
  lever: leverAdapter,
  ashby: ashbyAdapter,
  workable: workableAdapter,
  smartrecruiters: smartRecruitersAdapter,
  workday: workdayAdapter,
  eightfold: eightfoldAdapter,
  amazon: amazonAdapter,
  remotive: remotiveAdapter,
  wwr: wwrAdapter,
  himalayas: himalayasAdapter,
  workingnomads: workingNomadsAdapter,
  arbeitnow: arbeitnowAdapter,
  jobicy: jobicyAdapter,
  remoteok: remoteOkAdapter,
  bdjobs: bdjobsAdapter,
  wpjobs: wpJobsAdapter,
  successfactors: successFactorsAdapter,
}

export function getAdapter(kind: AdapterKind): Adapter {
  const adapter = ADAPTERS[kind]
  if (!adapter) throw new Error(`unknown adapter kind: ${kind}`)
  return adapter
}

export function hostGaps(): Record<string, number> {
  const gaps: Record<string, number> = {}
  for (const adapter of Object.values(ADAPTERS)) {
    for (const host of adapter.hosts) gaps[host] = adapter.minGapMs
  }
  return gaps
}
