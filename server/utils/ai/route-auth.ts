import type { H3Event } from 'h3'
import { requireAuth } from '../require-auth'
import { requireVerifiedClaimAccess } from '../organisation-access'

export async function requireAiVenueAccess(event: H3Event, venueId: number) {
  const user = await requireAuth(event)
  return requireVerifiedClaimAccess(user.id, venueId)
}
