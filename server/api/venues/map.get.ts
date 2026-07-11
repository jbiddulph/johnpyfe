import { prisma } from '../../utils/prisma'
type MapVenueRow = {
  fsa_id: number
  venuename: string
  latitude: string | null
  longitude: string | null
}

type MapVenuePoint = {
  fsaId: number
  name: string
  lat: number
  lng: number
}

let cachedPoints: MapVenuePoint[] | null = null
let cacheExpiresAt = 0
const CACHE_MS = 60 * 60 * 1000

function parseCoord(value: string | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

function mapRowsToPoints(rows: MapVenueRow[]): MapVenuePoint[] {
  const points: MapVenuePoint[] = []
  for (const venue of rows) {
    const lat = parseCoord(venue.latitude)
    const lng = parseCoord(venue.longitude)
    if (lat == null || lng == null) continue

    points.push({
      fsaId: venue.fsa_id,
      name: venue.venuename,
      lat,
      lng,
    })
  }
  return points
}

/** Lightweight venue points for clustered hub maps (cached, coord-filtered in SQL). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

  if (cachedPoints && Date.now() < cacheExpiresAt) {
    return cachedPoints
  }

  try {
    const rows = await prisma.venue.findMany({
      where: {
        slug: { not: '' },
        latitude: { not: '' },
        longitude: { not: '' },
      },
      select: {
        fsa_id: true,
        venuename: true,
        latitude: true,
        longitude: true,
      },
    })

    cachedPoints = mapRowsToPoints(rows)
    cacheExpiresAt = Date.now() + CACHE_MS
    return cachedPoints
  } catch (error) {
    console.error('[api/venues/map] failed:', error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Venue map data temporarily unavailable',
    })
  }
})
