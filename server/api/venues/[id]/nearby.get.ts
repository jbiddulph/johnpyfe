import { prisma } from '../../../utils/prisma'
import {
  NEARBY_VENUE_RADIUS_MILES,
  findNearbyVenues,
  venueCoordsForNearby,
} from '../../../utils/venue-nearby'

export default defineEventHandler(async (event) => {
  const idParam = event.context.params?.id
  const venueId = Number.parseInt(String(idParam), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, latitude: true, longitude: true },
  })

  if (!venue) {
    throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
  }

  const coords = venueCoordsForNearby(venue)
  if (!coords) {
    return { items: [], radiusMiles: NEARBY_VENUE_RADIUS_MILES }
  }

  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

  const items = await findNearbyVenues(prisma, venueId, coords.lat, coords.lon)

  return {
    items,
    radiusMiles: NEARBY_VENUE_RADIUS_MILES,
  }
})
