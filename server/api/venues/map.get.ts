import { prisma } from '../../utils/prisma'
type MapVenueRow = {
  id: number
  fsa_id: number
  venuename: string
  address: string
  town: string
  county: string
  postcode: string
  latitude: string | null
  longitude: string | null
}

type MapVenuePoint = {
  id: number
  fsaId: number
  name: string
  address: string
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
      id: venue.id,
      fsaId: venue.fsa_id,
      name: venue.venuename,
      address: formatAddress(venue),
      lat,
      lng,
    })
  }
  return points
}

function formatAddress(venue: Pick<MapVenueRow, 'address' | 'town' | 'county' | 'postcode'>) {
  return [
    venue.address,
    [venue.town, venue.county].filter(Boolean).join(', '),
    venue.postcode,
  ]
    .filter((part) => Boolean(String(part || '').trim()))
    .join(', ')
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
        id: true,
        fsa_id: true,
        venuename: true,
        address: true,
        town: true,
        county: true,
        postcode: true,
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
