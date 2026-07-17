/** Approx walking distance helpers for pub crawl legs (client + server safe). */

const EARTH_RADIUS_MILES = 3958.7613
const WALKING_MPH = 3.1
/** Typical walking routes are longer than crow-flies; ~1.25x is a common urban factor. */
const WALK_ROUTE_FACTOR = 1.25

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const a =
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
    + Math.sin(toRad(lat1)) * Math.sin(toRad(lat2))
  return EARTH_RADIUS_MILES * Math.acos(Math.min(1, Math.max(-1, a)))
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

export type CrawlLeg = {
  fromIndex: number
  toIndex: number
  miles: number | null
  label: string
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
      legs.push({ fromIndex: i, toIndex: i + 1, miles: null, label: 'Distance unknown' })
      continue
    }
    const miles = estimateWalkingMiles(lat1, lon1, lat2, lon2)
    legs.push({
      fromIndex: i,
      toIndex: i + 1,
      miles,
      label: formatWalkingDistance(miles),
    })
  }
  return legs
}
