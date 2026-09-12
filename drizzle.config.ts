import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
