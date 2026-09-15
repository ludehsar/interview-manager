import { listEntries, type EntryWithBullets } from '@/domain/profile/entries'
import { emptyPreferences, readProfile, type ProfileRow } from '@/domain/profile/profile'
import { ENTRY_KINDS, type EntryKind } from '@/domain/profile/schema'
import { listUploads, type UploadRow } from '@/domain/profile/uploads'
import { countKnowledge } from '@/domain/profile/kg'

export type ProfileOverview = {
  profile: ProfileRow
  entries: EntryWithBullets[]
  byKind: Record<EntryKind, EntryWithBullets[]>
  uploads: UploadRow[]
  knowledge: { chunks: number; nodes: number; embedded: number }
  counts: { entries: number; bullets: number; quantified: number; gaps: number }
}

function emptyProfile(userId: string): ProfileRow {
  return {
    userId,
    fullName: null,
    headline: null,
    location: null,
    phone: null,
    email: null,
    links: [],
    preferences: emptyPreferences(),
    updatedAt: new Date(),
  }
}

export async function getProfileOverview(userId: string): Promise<ProfileOverview> {
  const [profile, entries, uploads, knowledge] = await Promise.all([
    readProfile(userId),
    listEntries(userId),
    listUploads(userId),
    countKnowledge(userId),
  ])

  const byKind = Object.fromEntries(ENTRY_KINDS.map((kind) => [kind, [] as EntryWithBullets[]])) as Record<
    EntryKind,
    EntryWithBullets[]
  >
  for (const entry of entries) byKind[entry.kind].push(entry)

  const bullets = entries.flatMap((entry) => entry.bullets)

  return {
    profile: profile ?? emptyProfile(userId),
    entries,
    byKind,
    uploads,
    knowledge,
    counts: {
      entries: entries.length,
      bullets: bullets.length,
      quantified: bullets.filter((bullet) => bullet.metricStatus === 'QUANTIFIED').length,
      gaps: bullets.filter((bullet) => bullet.metricStatus === 'MISSING').length,
    },
  }
}
