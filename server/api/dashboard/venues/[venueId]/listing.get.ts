import { ownerVenueListingSchema, normalizePostcodeSearch, parseCoord, venueSlugFromName } from '../../../../utils/venue-listing'
import { requireVerifiedClaimAccess } from '../../../../utils/organisation-access'
import { requireAuth } from '../../../../utils/require-auth'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const venueId = Number.parseInt(String(event.context.params?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  await requireVerifiedClaimAccess(user.id, venueId)

  const venue = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!venue) {
    throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
  }

  return {
    venuename: venue.venuename,
    town: venue.town,
    county: venue.county,
    postcode: venue.postcode,
    address: venue.address,
    address2: venue.address2,
    telephone: venue.telephone,
    website: venue.website,
    description: venue.description,
    latitude: venue.latitude,
    longitude: venue.longitude,
    slug: venue.slug,
  }
})
