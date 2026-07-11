import { prisma } from '../../utils/prisma'
import { cleanDbString, slugifyPlace } from '../../../utils/format-venue'

type MapVenueRow = {
  id: number
  fsa_id: number
  slug: string
  venuename: string
  address: string
  address2: string
  town: string
  county: string
  latitude: string
  longitude: string
}

type MapVenuePoint = {
  id: number
  fsa_id: number
  slug: string
  venuename: string
  address: string | null
  address2: string | null
  town: string | null
  latitude: string
  longitude: string
  county: string | null
  countySlug: string
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

    const countyName = cleanDbString(venue.county)
    points.push({
      id: venue.id,
      fsa_id: venue.fsa_id,
      slug: venue.slug,
      venuename: venue.venuename,
      address: cleanDbString(venue.address),
      address2: cleanDbString(venue.address2),
      town: cleanDbString(venue.town),
      latitude: String(lat),
      longitude: String(lng),
      county: countyName,
      countySlug: countyName ? slugifyPlace(countyName) : '',
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
    const rows = await prisma.$queryRaw<MapVenueRow[]>`
      SELECT id, fsa_id, slug, venuename, address, address2, town, county, latitude, longitude
      FROM "Venue"
      WHERE slug <> ''
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude <> ''
        AND longitude <> ''
        AND latitude <> '0'
        AND longitude <> '0'
        AND latitude ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND longitude ~ '^-?[0-9]+(\\.[0-9]+)?$'
    `

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
