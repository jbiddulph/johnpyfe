import { prisma } from '../prisma'
import {
  nearbyBoundingBox,
} from '../venue-nearby'
import { MAP_FEATURE_FLAGS, featureFlagsFromText, flagBit } from '../../../utils/map-filters'
import { parseVenueFeatures, parseVenueCoord, cleanDbString } from '../../../utils/format-venue'
import { isHardKeyword } from './pub-search-filters'
import type { AiPubResult, AiPubSearchFilters } from '../../../utils/ai-pub-search'
import type { GeocodedPlace } from './pub-search-geocode'
import { haversineMiles } from '../../../utils/crawl-distance'

const EARTH_RADIUS_MILES = 3959
const CANDIDATE_LIMIT = 120

type SearchRow = {
  id: number
  slug: string
  venuename: string
  address: string
  town: string
  county: string
  postcode: string
  latitude: string
  longitude: string
  photo: string
  features: string | null
  description: string | null
  venuetype: string
  distance_miles: number | null
}

const HISTORIC_PATTERN = /historic|historical|grade\s*ii|16th|17th|18th|coaching\s*inn|listed\s*building|\bolde\b|oldest/i
const TRADITIONAL_PATTERN = /traditional|real\s*ale|cosy|cozy|olde|classic\s*pub|locals?\s*pub|camra/i
const SUNDAY_LUNCH_PATTERN = /sunday\s*(lunch|roast|carvery)/i

function keywordPattern(keyword: string) {
  const value = keyword.toLowerCase()
  if (value.includes('historic')) return HISTORIC_PATTERN
  if (value.includes('traditional')) return TRADITIONAL_PATTERN
  if (value.includes('sunday')) return SUNDAY_LUNCH_PATTERN
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(escaped, 'i')
}

function searchableText(row: SearchRow) {
  return [row.venuename, row.features, row.description, row.venuetype, row.town].filter(Boolean).join('\n')
}

function venueMatchesKeyword(row: SearchRow, keyword: string) {
  return keywordPattern(keyword).test(searchableText(row))
}

function distancePointToSegmentMiles(
  lat: number,
  lng: number,
  a: GeocodedPlace,
  b: GeocodedPlace,
) {
  const toXY = (point: { lat: number; lng: number }) => {
    const x = (point.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180) * 69
    const y = (point.lat - a.lat) * 69
    return { x, y }
  }
  const p = toXY({ lat, lng })
  const start = { x: 0, y: 0 }
  const end = toXY(b)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length2 = dx * dx + dy * dy
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, (p.x * dx + p.y * dy) / length2))
  const nearestX = start.x + t * dx
  const nearestY = start.y + t * dy
  return Math.hypot(p.x - nearestX, p.y - nearestY)
}

function toPubResult(row: SearchRow, origin: GeocodedPlace | null, requestedFeatures: string[]): AiPubResult {
  const lat = parseVenueCoord(row.latitude)
  const lng = parseVenueCoord(row.longitude)
  const mask = featureFlagsFromText(row.features)
  const matchedFeatures = requestedFeatures.filter((key) => {
    const flag = MAP_FEATURE_FLAGS.find((item) => item.key === key)
    return flag ? Boolean(mask & flagBit(flag.bit)) : false
  })
  const distance = origin && lat != null && lng != null
    ? haversineMiles(origin.lat, origin.lng, lat, lng)
    : Number(row.distance_miles)

  return {
    id: row.id,
    slug: row.slug,
    name: row.venuename,
    address: cleanDbString(row.address),
    town: cleanDbString(row.town),
    county: cleanDbString(row.county),
    postcode: cleanDbString(row.postcode),
    latitude: lat ?? 0,
    longitude: lng ?? 0,
    photo: cleanDbString(row.photo),
    features: parseVenueFeatures(row.features).slice(0, 8),
    distanceMiles: Number.isFinite(distance) ? Number(distance) : null,
    matchedFeatures,
  }
}

function featureMaskFor(keys: string[]) {
  return keys.reduce((mask, key) => {
    const flag = MAP_FEATURE_FLAGS.find((item) => item.key === key)
    return flag ? mask | flagBit(flag.bit) : mask
  }, 0)
}

async function queryBoundingBox(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  origin: GeocodedPlace | null,
) {
  const lat = origin?.lat ?? (minLat + maxLat) / 2
  const lon = origin?.lng ?? (minLon + maxLon) / 2

  return prisma.$queryRaw<SearchRow[]>`
    SELECT
      v.id,
      v.slug,
      v.venuename,
      v.address,
      v.town,
      v.county,
      v.postcode,
      v.latitude,
      v.longitude,
      v.photo,
      v.features,
      v.description,
      v.venuetype,
      (
        ${EARTH_RADIUS_MILES} * acos(
          LEAST(1::float8, GREATEST(-1::float8,
            cos(radians(${lat}::float8)) * cos(radians(v.latitude::float8))
              * cos(radians(v.longitude::float8) - radians(${lon}::float8))
            + sin(radians(${lat}::float8)) * sin(radians(v.latitude::float8))
          ))
        )
      ) AS distance_miles
    FROM "Venue" v
    WHERE v.is_live = '1'
      AND v.slug <> ''
      AND v.latitude IS NOT NULL
      AND v.longitude IS NOT NULL
      AND v.latitude <> ''
      AND v.longitude <> ''
      AND v.latitude <> '0'
      AND v.longitude <> '0'
      AND v.latitude ~ '^-?[0-9]+(\\.[0-9]+)?$'
      AND v.longitude ~ '^-?[0-9]+(\\.[0-9]+)?$'
      AND v.latitude::float8 BETWEEN ${minLat} AND ${maxLat}
      AND v.longitude::float8 BETWEEN ${minLon} AND ${maxLon}
    ORDER BY distance_miles ASC
    LIMIT ${CANDIDATE_LIMIT}
  `
}

async function queryByTownName(location: string, take: number) {
  return prisma.venue.findMany({
    where: {
      is_live: '1',
      slug: { not: '' },
      OR: [
        { town: { contains: location, mode: 'insensitive' } },
        { county: { contains: location, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      slug: true,
      venuename: true,
      address: true,
      town: true,
      county: true,
      postcode: true,
      latitude: true,
      longitude: true,
      photo: true,
      features: true,
      description: true,
      venuetype: true,
    },
    take,
  })
}

function applyFilters(rows: SearchRow[], filters: AiPubSearchFilters, origin: GeocodedPlace | null, end: GeocodedPlace | null) {
  const requiredMask = featureMaskFor(filters.features)
  const hardKeywords = filters.keywords.filter(isHardKeyword)
  const softKeywords = filters.keywords.filter((keyword) => !isHardKeyword(keyword))

  let matched = rows.filter((row) => {
    const lat = parseVenueCoord(row.latitude)
    const lng = parseVenueCoord(row.longitude)
    if (lat == null || lng == null) return false

    if (origin && end) {
      if (distancePointToSegmentMiles(lat, lng, origin, end) > filters.radiusMiles) return false
    } else if (origin && Number.isFinite(Number(row.distance_miles))) {
      if (Number(row.distance_miles) > filters.radiusMiles) return false
    }

    if (requiredMask) {
      const mask = featureFlagsFromText(row.features)
      if ((mask & requiredMask) !== requiredMask) return false
    }

    return hardKeywords.every((keyword) => venueMatchesKeyword(row, keyword))
  })

  if (softKeywords.length) {
    const boosted = matched.filter((row) => softKeywords.some((keyword) => venueMatchesKeyword(row, keyword)))
    if (boosted.length >= Math.min(3, filters.limit) || boosted.length === matched.length) {
      matched = boosted.length ? boosted : matched
    } else {
      const boostedIds = new Set(boosted.map((row) => row.id))
      matched = [
        ...boosted,
        ...matched.filter((row) => !boostedIds.has(row.id)),
      ]
    }
  }

  return matched
}

export async function searchPubsFromFilters(
  filters: AiPubSearchFilters,
  origin: GeocodedPlace | null,
  end: GeocodedPlace | null = null,
): Promise<AiPubResult[]> {
  let rows: SearchRow[] = []

  if (origin && end) {
    const minLat = Math.min(origin.lat, end.lat)
    const maxLat = Math.max(origin.lat, end.lat)
    const minLon = Math.min(origin.lng, end.lng)
    const maxLon = Math.max(origin.lng, end.lng)
    const pad = nearbyBoundingBox(origin.lat, origin.lng, filters.radiusMiles)
    const latPad = pad.maxLat - origin.lat
    const lonPad = pad.maxLon - origin.lng
    rows = await queryBoundingBox(
      minLat - latPad,
      maxLat + latPad,
      minLon - lonPad,
      maxLon + lonPad,
      origin,
    )
  } else if (origin) {
    const box = nearbyBoundingBox(origin.lat, origin.lng, filters.radiusMiles)
    rows = await queryBoundingBox(box.minLat, box.maxLat, box.minLon, box.maxLon, origin)
  } else if (filters.location) {
    const venues = await queryByTownName(filters.location, CANDIDATE_LIMIT)
    rows = venues.map((venue) => ({
      ...venue,
      distance_miles: null,
    }))
  }

  const matched = applyFilters(rows, filters, origin, end)
  return matched.slice(0, filters.limit).map((row) => toPubResult(row, origin, filters.features))
}

export async function getVerifiedPubDetails(venueId: number): Promise<AiPubResult & {
  description: string | null
  website: string | null
  telephone: string | null
  venuetype: string | null
} | null> {
  if (!Number.isFinite(venueId) || venueId <= 0) return null

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true,
      slug: true,
      venuename: true,
      address: true,
      town: true,
      county: true,
      postcode: true,
      latitude: true,
      longitude: true,
      photo: true,
      features: true,
      description: true,
      website: true,
      telephone: true,
      venuetype: true,
      is_live: true,
    },
  })

  if (!venue || venue.is_live !== '1') return null

  const lat = parseVenueCoord(venue.latitude)
  const lng = parseVenueCoord(venue.longitude)
  if (lat == null || lng == null) return null

  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.venuename,
    address: cleanDbString(venue.address),
    town: cleanDbString(venue.town),
    county: cleanDbString(venue.county),
    postcode: cleanDbString(venue.postcode),
    latitude: lat,
    longitude: lng,
    photo: cleanDbString(venue.photo),
    features: parseVenueFeatures(venue.features).slice(0, 12),
    distanceMiles: null,
    matchedFeatures: [],
    description: cleanDbString(venue.description),
    website: cleanDbString(venue.website),
    telephone: cleanDbString(venue.telephone),
    venuetype: cleanDbString(venue.venuetype),
  }
}

export async function loadPubsByIds(venueIds: number[]): Promise<AiPubResult[]> {
  const ids = [...new Set(venueIds.filter((id) => Number.isFinite(id) && id > 0))].slice(0, 12)
  if (!ids.length) return []

  const venues = await prisma.venue.findMany({
    where: { id: { in: ids }, is_live: '1' },
    select: {
      id: true,
      slug: true,
      venuename: true,
      address: true,
      town: true,
      county: true,
      postcode: true,
      latitude: true,
      longitude: true,
      photo: true,
      features: true,
      description: true,
      venuetype: true,
    },
  })

  const byId = new Map(venues.map((venue) => [venue.id, venue]))
  return ids.flatMap((id) => {
    const venue = byId.get(id)
    if (!venue) return []
    return [toPubResult({ ...venue, distance_miles: null }, null, [])]
  })
}
