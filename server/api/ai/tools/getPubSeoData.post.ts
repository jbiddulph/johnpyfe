import { getPubSeoData } from '../../../utils/ai/seo-agent'
import { requireAiVenueAccess } from '../../../utils/ai/route-auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const venueId = Number.parseInt(String(body?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  await requireAiVenueAccess(event, venueId)
  return getPubSeoData(venueId)
})
