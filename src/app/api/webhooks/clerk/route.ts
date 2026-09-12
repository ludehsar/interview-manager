import type { NextRequest } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { deleteUserByClerkId, ensureUser } from '@/domain/profile/users'

export async function POST(request: NextRequest) {
  let event
  try {
    event = await verifyWebhook(request)
  } catch {
    return new Response('invalid signature', { status: 400 })
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const primaryId = event.data.primary_email_address_id
    const email =
      event.data.email_addresses?.find((e) => e.id === primaryId)?.email_address ??
      event.data.email_addresses?.[0]?.email_address ??
      null
    await ensureUser(event.data.id, email)
  }

  if (event.type === 'user.deleted' && event.data.id) {
    await deleteUserByClerkId(event.data.id)
  }

  return new Response('ok', { status: 200 })
}
