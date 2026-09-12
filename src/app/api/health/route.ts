import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { isLocalAws } from '@/aws/clients'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {}
  let healthy = true

  try {
    const result = await db().execute(sql`select count(*)::int as count from information_schema.tables where table_schema = 'public'`)
    const rows = (result as unknown as { rows: { count: number }[] }).rows
    checks.database = `ok, ${rows[0].count} tables`
  } catch (err) {
    healthy = false
    checks.database = err instanceof Error ? err.message : 'failed'
  }

  checks.aws = isLocalAws() ? `localstack at ${process.env.AWS_ENDPOINT_URL}` : 'aws'
  checks.clerk = process.env.CLERK_SECRET_KEY ? 'configured' : 'missing keys'
  checks.anthropic = process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing key'

  return Response.json({ healthy, checks }, { status: healthy ? 200 : 503 })
}
