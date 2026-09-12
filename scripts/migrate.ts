import { config } from 'dotenv'
import { closeDatabase, createDatabase, isLocalDatabase } from '@/db/client'
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

const MIGRATIONS = { migrationsFolder: './src/db/migrations' }

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const database = createDatabase(url)
  if (isLocalDatabase(url)) {
    await migratePg(database as never, MIGRATIONS)
  } else {
    await migrateNeon(database, MIGRATIONS)
  }

  await closeDatabase()
  console.log(`migrations applied to ${new URL(url).hostname}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
