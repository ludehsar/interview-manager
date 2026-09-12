import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { closeDatabase, db } from '@/db/client'
import { classifyDiscipline } from '@/domain/jobs/discipline'
import { parseLocation, regionFromCountries } from '@/domain/jobs/location'
import type { Discipline, RemoteRegion } from '@/domain/jobs/types'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

const BATCH_SIZE = 1000

type Row = {
  id: string
  title: string
  skills: string[] | null
  location_raw: string | null
  countries: string[] | null
  remote_region: RemoteRegion
  source_kind: string
}

type Update = {
  id: string
  cities: string[]
  countries: string[]
  workplaceType: string
  remoteRegion: RemoteRegion
  discipline: Discipline
}

async function readBatch(afterId: string | null): Promise<Row[]> {
  const result = await db().execute(sql`
    select id, title, skills, location_raw, countries, remote_region, source_kind
    from jobs
    ${afterId ? sql`where id > ${afterId}` : sql``}
    order by id asc
    limit ${BATCH_SIZE}
  `)
  return (result.rows ?? result) as unknown as Row[]
}

async function writeBatch(updates: Update[]): Promise<void> {
  if (updates.length === 0) return
  await db().execute(sql`
    update jobs j
    set cities = u.cities,
        countries = u.countries,
        workplace_type = u.workplace_type,
        remote_region = u.remote_region,
        discipline = u.discipline
    from (
      select * from json_to_recordset(${JSON.stringify(
        updates.map((update) => ({
          id: update.id,
          cities: update.cities,
          countries: update.countries,
          workplace_type: update.workplaceType,
          remote_region: update.remoteRegion,
          discipline: update.discipline,
        })),
      )}::json)
      as x(id text, cities text[], countries text[], workplace_type workplace_type,
           remote_region remote_region, discipline discipline)
    ) u
    where j.id = u.id
  `)
}

async function main() {
  let afterId: string | null = null
  let scanned = 0
  let changed = 0

  for (;;) {
    const rows = await readBatch(afterId)
    if (rows.length === 0) break

    const updates: Update[] = []
    for (const row of rows) {
      const parsed = parseLocation(row.location_raw, {
        seedCountries: row.countries ?? [],
        fallbackCountry: row.source_kind === 'bdjobs' ? 'BD' : null,
      })
      const remoteRegion =
        row.remote_region === 'UNKNOWN' ? regionFromCountries(parsed.countries) : row.remote_region
      updates.push({
        id: row.id,
        cities: parsed.cities,
        countries: parsed.countries,
        workplaceType: parsed.workplaceType,
        remoteRegion,
        discipline: classifyDiscipline(row.title, row.skills ?? []),
      })
    }

    await writeBatch(updates)
    scanned += rows.length
    changed += updates.length
    afterId = rows[rows.length - 1].id
    console.log(`scanned ${scanned}`)
    if (rows.length < BATCH_SIZE) break
  }

  console.log(`done, ${changed}/${scanned} rows rewritten`)
  await closeDatabase()
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error)
  await closeDatabase().catch(() => undefined)
  process.exit(1)
})
