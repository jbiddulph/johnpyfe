import { prisma } from './prisma'
import { isBrokenVenuePhoto, isDefaultVenuePhoto } from '../../utils/format-venue'
import {
  MAP_META_FLAGS,
  featureFlagsFromText,
  flagBit,
  normaliseVenueType,
  type MapVenuePoint,
} from '../../utils/map-filters'

export type MapPointsPayload = {
  points: MapVenuePoint[]
  /** Venue type legend; `point.t` indexes into this array. */
  types: string[]
  generatedAt: number
}

let cached: MapPointsPayload | null = null
let cacheExpiresAt = 0
let inflight: Promise<MapPointsPayload> | null = null
const CACHE_MS = 60 * 60 * 1000

function parseCoord(value: string | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

async function upcomingEventVenueIds(): Promise<Set<number>> {
  try {
    const rows = await prisma.event.groupBy({
      by: ['listingId'],
      where: { event_start: { gte: new Date() } },
    })
    return new Set(rows.map((row) => row.listingId))
  } catch (error) {
    console.warn('[map-points] could not load upcoming event venues:', (error as Error).message)
    return new Set()
  }
}

async function buildMapPoints(): Promise<MapPointsPayload> {
  const [rows, eventVenueIds] = await Promise.all([
    prisma.venue.findMany({
      where: {
        slug: { not: '' },
        latitude: { not: '' },
        longitude: { not: '' },
      },
      select: {
        id: true,
        fsa_id: true,
        venuename: true,
        venuetype: true,
        latitude: true,
        longitude: true,
        features: true,
        photo: true,
        website: true,
        description: true,
      },
    }),
    upcomingEventVenueIds(),
  ])

  const typeIndex = new Map<string, number>()
  const types: string[] = []
  const points: MapVenuePoint[] = []

  for (const venue of rows) {
    const lat = parseCoord(venue.latitude)
    const lng = parseCoord(venue.longitude)
    if (lat == null || lng == null) continue

    const typeLabel = normaliseVenueType(venue.venuetype)
    let t = typeIndex.get(typeLabel)
    if (t === undefined) {
      t = types.length
      types.push(typeLabel)
      typeIndex.set(typeLabel, t)
    }

    let f = featureFlagsFromText(venue.features)
    if (!isDefaultVenuePhoto(venue.photo) && !isBrokenVenuePhoto(venue.photo)) f |= flagBit(MAP_META_FLAGS.hasPhoto)
    if (eventVenueIds.has(venue.id)) f |= flagBit(MAP_META_FLAGS.hasEvents)
    if (String(venue.website ?? '').trim() && venue.website?.toLowerCase() !== 'null') f |= flagBit(MAP_META_FLAGS.hasWebsite)
    if (String(venue.description ?? '').trim().length >= 40) f |= flagBit(MAP_META_FLAGS.hasDescription)

    const point: MapVenuePoint = { id: venue.id, fsaId: venue.fsa_id, name: venue.venuename, lat, lng }
    if (t) point.t = t
    if (f) point.f = f
    points.push(point)
  }

  return { points, types, generatedAt: Date.now() }
}

/** Cached, lightweight venue points + legend for the clustered maps (1h in-memory cache). */
export async function getMapPoints(): Promise<MapPointsPayload> {
  if (cached && Date.now() < cacheExpiresAt) return cached
  if (inflight) return inflight
  inflight = buildMapPoints()
    .then((payload) => {
      cached = payload
      cacheExpiresAt = Date.now() + CACHE_MS
      return payload
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}
