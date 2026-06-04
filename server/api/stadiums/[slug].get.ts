import { prisma } from '../../utils/prisma'
import { slugifyPlace } from '../../../utils/format-venue'
import {
  countVenuesNearPoint,
  findVenuesNearPoint,
  NEARBY_VENUE_RADIUS_MILES,
} from '../../utils/venue-nearby'

export default defineEventHandler(async (event) => {
  const slug = String(event.context.params?.slug || '').trim()
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing stadium slug' })
  }

  const stadiums = await prisma.stadium.findMany({ orderBy: { club: 'asc' } })
  const stadium = stadiums.find((s) => slugifyPlace(s.club) === slug)

  if (!stadium) {
    throw createError({ statusCode: 404, statusMessage: 'Stadium not found' })
  }

  const lat = Number(stadium.latitude)
  const lon = Number(stadium.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw createError({ statusCode: 404, statusMessage: 'Stadium coordinates missing' })
  }

  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800')

  const [pubCount, venues] = await Promise.all([
    countVenuesNearPoint(prisma, lat, lon, NEARBY_VENUE_RADIUS_MILES),
    findVenuesNearPoint(prisma, lat, lon, NEARBY_VENUE_RADIUS_MILES, 60),
  ])

  return {
    id: Number(stadium.id),
    slug,
    club: stadium.club,
    stadiumName: stadium.stadium_name,
    latitude: lat,
    longitude: lon,
    radiusMiles: NEARBY_VENUE_RADIUS_MILES,
    pubCount,
    venues,
  }
})
