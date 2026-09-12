import { config } from 'dotenv'
import { SOURCES } from '@/adapters/sources'
import { closeDatabase } from '@/db/client'
import { seedSourceState } from '@/domain/jobs/source-state'

config({ path: '.env' })
config({ path: '.env.local', override: true })

async function main() {
  const count = await seedSourceState(SOURCES)
  const enabled = SOURCES.filter((source) => source.enabled).length
  console.log(`seeded ${count} sources (${enabled} enabled)`)
  await closeDatabase()
}

main().catch(async (error) => {
  console.error(error)
  await closeDatabase()
  process.exit(1)
})
