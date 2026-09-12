import { z } from 'zod'

export const RemoteRegionSchema = z.object({
  region: z.enum(['WORLDWIDE', 'APAC', 'BANGLADESH', 'REGION_LOCKED', 'UNKNOWN']),
  countries: z.array(z.string().length(2)).max(12),
  reason: z.string().max(200),
})

export type RemoteRegionVerdict = z.infer<typeof RemoteRegionSchema>

export const REMOTE_REGION_SYSTEM = `You classify the hiring location of a remote job posting into one region.

Regions:
- WORLDWIDE: the employer accepts applicants from any country or any timezone.
- APAC: hiring is limited to the Asia-Pacific region (South, Southeast, East Asia, Australia, New Zealand) or to timezones roughly UTC+5 to UTC+12.
- BANGLADESH: hiring is limited to Bangladesh or a Bangladeshi city.
- REGION_LOCKED: hiring is limited to some other country, timezone band or bloc (for example US only, EMEA, EU, LATAM).
- UNKNOWN: the text carries no usable location signal.

Rules:
- Judge only the location constraint, never the seniority, salary or role.
- countries holds ISO 3166-1 alpha-2 codes for the countries the posting is restricted to, empty when the region is WORLDWIDE or UNKNOWN.
- A bare word like "remote" with no other signal is UNKNOWN, not WORLDWIDE.
- reason is one short sentence quoting the decisive phrase.`
