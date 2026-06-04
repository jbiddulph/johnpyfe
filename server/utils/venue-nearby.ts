import type { PrismaClient } from '@prisma/client'
import { parseVenueCoord } from '../../utils/format-venue'

/** Straight-line radius (approx. walking distance without routing). */
export const NEARBY_VENUE_RADIUS_MILES = 1

const EARTH_RADIUS_MILES = 3959
const MAX_NEARBY_RESULTS = 24

/** ~69 statute miles per degree of latitude. */
const MILES_PER_DEGREE_LAT = 69

export type NearbyVenueRow = {
  id: number
  slug: string
  venuename: string
  address: string
  town: string
  postcode: string
  latitude: string
  longitude: string
  photo: string
  telephone: string
  website: string
  distance_miles: number
}

export function nearbyBoundingBox(lat: number, lon: number, radiusMiles: number) {
  const latDelta = radiusMiles / MILES_PER_DEGREE_LAT
  const lonDelta = radiusMiles / (MILES_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  }
}

export async function findNearbyVenues(
  prisma: PrismaClient,
  venueId: number,
  lat: number,
  lon: number,
  radiusMiles = NEARBY_VENUE_RADIUS_MILES,
) {
  const { minLat, maxLat, minLon, maxLon } = nearbyBoundingBox(lat, lon, radiusMiles)

  const rows = await prisma.$queryRaw<NearbyVenueRow[]>`
    SELECT *
    FROM (
      SELECT
        v.id,
        v.slug,
        v.venuename,
        v.address,
        v.town,
        v.postcode,
        v.latitude,
        v.longitude,
        v.photo,
        v.telephone,
        v.website,
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
      WHERE v.id <> ${venueId}
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
    ) nearby
    WHERE nearby.distance_miles <= ${radiusMiles}
    ORDER BY nearby.distance_miles ASC
    LIMIT ${MAX_NEARBY_RESULTS}
  `

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    venuename: row.venuename,
    address: row.address,
    town: row.town,
    postcode: row.postcode,
    latitude: row.latitude,
    longitude: row.longitude,
    photo: row.photo,
    telephone: row.telephone,
    website: row.website,
    distanceMiles: Number(row.distance_miles),
  }))
}

export function venueCoordsForNearby(venue: {
  latitude?: unknown
  longitude?: unknown
}): { lat: number; lon: number } | null {
  const lat = parseVenueCoord(venue.latitude)
  const lon = parseVenueCoord(venue.longitude)
  if (lat == null || lon == null) return null
  return { lat, lon }
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const a =
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
    + Math.sin(toRad(lat1)) * Math.sin(toRad(lat2))
  return EARTH_RADIUS_MILES * Math.acos(Math.min(1, Math.max(-1, a)))
}

/** Count live venues within radius of a point (e.g. Premier League stadium). */
export async function countVenuesNearPoint(
  prisma: PrismaClient,
  lat: number,
  lon: number,
  radiusMiles = NEARBY_VENUE_RADIUS_MILES,
) {
  const { minLat, maxLat, minLon, maxLon } = nearbyBoundingBox(lat, lon, radiusMiles)

  const rows = await prisma.$queryRaw<[{ count: number }]>`
    SELECT COUNT(*)::int AS count
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
      AND (
        ${EARTH_RADIUS_MILES} * acos(
          LEAST(1::float8, GREATEST(-1::float8,
            cos(radians(${lat}::float8)) * cos(radians(v.latitude::float8))
              * cos(radians(v.longitude::float8) - radians(${lon}::float8))
            + sin(radians(${lat}::float8)) * sin(radians(v.latitude::float8))
          ))
        )
      ) <= ${radiusMiles}
  `

  return Number(rows[0]?.count ?? 0)
}

export async function findVenuesNearPoint(
  prisma: PrismaClient,
  lat: number,
  lon: number,
  radiusMiles = NEARBY_VENUE_RADIUS_MILES,
  limit = 48,
) {
  const { minLat, maxLat, minLon, maxLon } = nearbyBoundingBox(lat, lon, radiusMiles)

  const rows = await prisma.$queryRaw<NearbyVenueRow[]>`
    SELECT *
    FROM (
      SELECT
        v.id,
        v.slug,
        v.venuename,
        v.address,
        v.town,
        v.postcode,
        v.latitude,
        v.longitude,
        v.photo,
        v.telephone,
        v.website,
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
    ) nearby
    WHERE nearby.distance_miles <= ${radiusMiles}
    ORDER BY nearby.distance_miles ASC
    LIMIT ${limit}
  `

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    venuename: row.venuename,
    address: row.address,
    town: row.town,
    postcode: row.postcode,
    latitude: row.latitude,
    longitude: row.longitude,
    photo: row.photo,
    telephone: row.telephone,
    website: row.website,
    distanceMiles: Number(row.distance_miles),
  }))
}

export { haversineMiles }
