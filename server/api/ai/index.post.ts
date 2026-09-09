import { requireAuth } from '../../utils/require-auth'
import { requireVerifiedClaimAccess } from '../../utils/organisation-access'
import { approveSeoRecommendation, runSeoForVenue } from '../../utils/ai/seo-agent'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const venueId = Number.parseInt(String(body?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  const action = String(body?.action || 'analyseSeo')
  if (action === 'approveSeoRecommendation') {
    const user = await requireAuth(event)
    await requireVerifiedClaimAccess(user.id, venueId)
    const recommendationId = String(body?.recommendationId || '')
    if (!recommendationId) {
      throw createError({ statusCode: 400, statusMessage: 'Missing recommendation id' })
    }
    return approveSeoRecommendation(venueId, recommendationId)
  }

  const user = await requireAuth(event)
  await requireVerifiedClaimAccess(user.id, venueId)
  return runSeoForVenue(venueId)
})
