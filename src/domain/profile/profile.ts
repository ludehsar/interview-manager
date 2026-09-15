import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import type { Basics, Preferences } from './schema'

export type ProfileRow = {
  userId: string
  fullName: string | null
  headline: string | null
  location: string | null
  phone: string | null
  email: string | null
  links: { label: string; url: string }[]
  preferences: Preferences
  updatedAt: Date
}

const EMPTY_PREFERENCES: Preferences = {
  targetTitles: [],
  seniority: [],
  remoteRegions: [],
  employmentTypes: [],
  salaryMinUsdMonth: null,
  excludedCompanies: [],
}

export function emptyPreferences(): Preferences {
  return { ...EMPTY_PREFERENCES }
}

export async function readProfile(userId: string): Promise<ProfileRow | null> {
  const rows = await db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
  const row = rows[0]
  if (!row) return null

  return {
    userId: row.userId,
    fullName: row.fullName,
    headline: row.headline,
    location: row.location,
    phone: row.phone,
    email: row.email,
    links: row.links ?? [],
    preferences: { ...EMPTY_PREFERENCES, ...(row.preferences ?? {}) } as Preferences,
    updatedAt: row.updatedAt,
  }
}

export async function saveBasics(userId: string, input: Basics): Promise<void> {
  await db()
    .insert(profiles)
    .values({
      userId,
      fullName: input.fullName,
      headline: input.headline,
      location: input.location,
      email: input.email,
      phone: input.phone,
      links: input.links,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: input.fullName,
        headline: input.headline,
        location: input.location,
        email: input.email,
        phone: input.phone,
        links: input.links,
        updatedAt: new Date(),
      },
    })
}

type StoredPreferences = {
  targetTitles?: string[]
  seniority?: string[]
  remoteRegions?: string[]
  employmentTypes?: string[]
  salaryMinUsdMonth?: number
  excludedCompanies?: string[]
}

function toStored(input: Preferences): StoredPreferences {
  const stored: StoredPreferences = {
    targetTitles: input.targetTitles,
    seniority: input.seniority,
    remoteRegions: input.remoteRegions,
    employmentTypes: input.employmentTypes,
    excludedCompanies: input.excludedCompanies,
  }
  if (input.salaryMinUsdMonth !== null) stored.salaryMinUsdMonth = input.salaryMinUsdMonth
  return stored
}

export async function savePreferences(userId: string, input: Preferences): Promise<void> {
  const preferences = toStored(input)
  await db()
    .insert(profiles)
    .values({ userId, preferences, updatedAt: new Date() })
    .onConflictDoUpdate({ target: profiles.userId, set: { preferences, updatedAt: new Date() } })
}
