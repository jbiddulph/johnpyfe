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

  const body = await readBody(event)
  const { error, value } = ownerVenueListingSchema.validate(body, { abortEarly: false, stripUnknown: true })
  if (error) {
    throw createError({ statusCode: 412, statusMessage: error.message })
  }

  const latitude = parseCoord(value.latitude)
  const longitude = parseCoord(value.longitude)
  const postcode = String(value.postcode || '').trim()
  const slug = venueSlugFromName(value.venuename, venueId)
  const now = new Date().toISOString()

  const venue = await prisma.venue.update({
    where: { id: venueId },
    data: {
      venuename: value.venuename,
      slug,
      town: String(value.town || '').trim(),
      county: String(value.county || '').trim(),
      postcode,
      postalsearch: normalizePostcodeSearch(postcode),
      address: String(value.address || '').trim(),
      address2: String(value.address2 || '').trim(),
      telephone: String(value.telephone || '').trim(),
      website: String(value.website || '').trim(),
      description: value.description || null,
      latitude: latitude ?? '',
      longitude: longitude ?? '',
      updated_at: now,
    },
  })

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
