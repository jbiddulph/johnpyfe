/** Approx walking distance helpers for pub crawl legs (client + server safe). */

const EARTH_RADIUS_MILES = 3958.7613
const EARTH_RADIUS_METERS = 6371000
const WALKING_MPH = 3.1
/** Typical walking routes are longer than crow-flies; ~1.25x is a common urban factor. */
const WALK_ROUTE_FACTOR = 1.25

/** Arrival radius for auto check-in at a crawl stop. */
export const CRAWL_ARRIVAL_RADIUS_METERS = 50

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const a =
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
    + Math.sin(toRad(lat1)) * Math.sin(toRad(lat2))
  return EARTH_RADIUS_MILES * Math.acos(Math.min(1, Math.max(-1, a)))
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function estimateWalkingMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  return haversineMiles(lat1, lon1, lat2, lon2) * WALK_ROUTE_FACTOR
}

export function estimateWalkingMinutes(miles: number) {
  return Math.round((miles / WALKING_MPH) * 60)
}

export function formatWalkingDistance(miles: number) {
  if (!Number.isFinite(miles) || miles < 0) return ''
  if (miles < 0.1) {
    const yards = Math.round(miles * 1760)
    return `${yards} yd walk`
  }
  const mins = estimateWalkingMinutes(miles)
  const milesLabel = miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()
  return `~${milesLabel} mi · ${mins} min walk`
}

/** Shorter label for map mid-point markers. */
export function formatWalkingDistanceShort(miles: number) {
  if (!Number.isFinite(miles) || miles < 0) return ''
  if (miles < 0.1) {
    const meters = Math.round(miles * 1609.344)
    return `~${meters} m`
  }
  const mins = estimateWalkingMinutes(miles)
  const milesLabel = miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()
  return `~${milesLabel} mi · ${mins} min`
}

export type CrawlLeg = {
  fromIndex: number
  toIndex: number
  miles: number | null
  label: string
  shortLabel: string
  midLat: number | null
  midLng: number | null
}

export function buildCrawlLegs(
  stops: Array<{ latitude?: number | null; longitude?: number | null }>,
): CrawlLeg[] {
  const legs: CrawlLeg[] = []
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    const lat1 = a.latitude
    const lon1 = a.longitude
    const lat2 = b.latitude
    const lon2 = b.longitude
    if (
      lat1 == null || lon1 == null || lat2 == null || lon2 == null
      || !Number.isFinite(lat1) || !Number.isFinite(lon1)
      || !Number.isFinite(lat2) || !Number.isFinite(lon2)
    ) {
      legs.push({
        fromIndex: i,
        toIndex: i + 1,
        miles: null,
        label: 'Distance unknown',
        shortLabel: '?',
        midLat: null,
        midLng: null,
      })
      continue
    }
    const miles = estimateWalkingMiles(lat1, lon1, lat2, lon2)
    legs.push({
      fromIndex: i,
      toIndex: i + 1,
      miles,
      label: formatWalkingDistance(miles),
      shortLabel: formatWalkingDistanceShort(miles),
      midLat: (lat1 + lat2) / 2,
      midLng: (lon1 + lon2) / 2,
    })
  }
  return legs
}

export function findNearestStopIndex(
  lat: number,
  lng: number,
  stops: Array<{ latitude?: number | null; longitude?: number | null }>,
  radiusMeters = CRAWL_ARRIVAL_RADIUS_METERS,
) {
  let bestIndex = -1
  let bestMeters = Infinity
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i]
    if (stop.latitude == null || stop.longitude == null) continue
    if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) continue
    const meters = haversineMeters(lat, lng, stop.latitude, stop.longitude)
    if (meters <= radiusMeters && meters < bestMeters) {
      bestMeters = meters
      bestIndex = i
    }
  }
  return bestIndex >= 0 ? { index: bestIndex, meters: bestMeters } : null
}
