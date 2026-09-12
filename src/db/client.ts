import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Database = NeonHttpDatabase<typeof schema>

let cached: Database | null = null
let pool: Pool | null = null

export function isLocalDatabase(url: string) {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres' || host === 'host.docker.internal'
  } catch {
    return false
  }
}

export function createDatabase(url: string): Database {
  if (isLocalDatabase(url)) {
    pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5) })
    return drizzlePg(pool, { schema, casing: 'snake_case' }) as unknown as Database
  }
  return drizzleNeon(neon(url), { schema, casing: 'snake_case' })
}

export function db(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    cached = createDatabase(url)
  }
  return cached
}

export async function closeDatabase() {
  if (pool) {
    await pool.end()
    pool = null
  }
  cached = null
}

export { schema }
