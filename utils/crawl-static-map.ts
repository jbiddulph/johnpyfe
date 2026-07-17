import { parseVenueCoord } from '@/utils/format-venue'

export type CrawlMapStop = {
  latitude?: unknown
  longitude?: unknown
  venueName?: string | null
}

/** Valid [lng, lat] pairs from crawl stops, in list order. */
export function crawlStopCoordinates(stops: CrawlMapStop[] | null | undefined): [number, number][] {
  if (!Array.isArray(stops)) return []
  const out: [number, number][] = []
  for (const stop of stops) {
    const lat = parseVenueCoord(stop.latitude)
    const lng = parseVenueCoord(stop.longitude)
    if (lat == null || lng == null) continue
    if (lat === 0 && lng === 0) continue
    out.push([lng, lat])
  }
  return out
}

/** ~degrees for a minimum framing span so nearby pubs still fill the card. */
const MIN_SPAN_DEG = 0.0018 // ~200m
/** Extra margin around the route (fraction of span). */
const EDGE_PAD = 0.18

function routeViewport(points: [number, number][]) {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }

  const centerLng = (minLng + maxLng) / 2
  const centerLat = (minLat + maxLat) / 2
  const halfLng = Math.max((maxLng - minLng) / 2, MIN_SPAN_DEG / 2) * (1 + EDGE_PAD)
  const halfLat = Math.max((maxLat - minLat) / 2, MIN_SPAN_DEG / 2) * (1 + EDGE_PAD)

  return {
    centerLng,
    centerLat,
    west: centerLng - halfLng,
    south: centerLat - halfLat,
    east: centerLng + halfLng,
    north: centerLat + halfLat,
  }
}

/**
 * Web-mercator zoom that fits a lon/lat span into the image size.
 * Biased toward street-level for pub-crawl distances.
 */
function zoomForSpan(
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
): number {
  const WORLD = 256
  const MAX_ZOOM = 16.5
  const MIN_ZOOM = 11

  const latRad = (lat: number) => {
    const sin = Math.sin((lat * Math.PI) / 180)
    const radX2 = Math.log((1 + sin) / (1 - sin)) / 2
    return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2
  }

  const latFraction = Math.max((latRad(north) - latRad(south)) / Math.PI, 1e-9)
  const lngDiff = east - west
  const lngFraction = Math.max(((lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360), 1e-9)

  const zoom = (mapPx: number, fraction: number) =>
    Math.log2(mapPx / WORLD / fraction)

  const z = Math.min(zoom(width, lngFraction), zoom(height, latFraction), MAX_ZOOM)
  return Math.max(Math.round(z * 100) / 100, MIN_ZOOM)
}

/**
 * Mapbox Static Images URL zoomed tightly onto the crawl route (path + numbered pins).
 */
export function crawlStaticMapUrl(
  stops: CrawlMapStop[] | null | undefined,
  token: string,
  width = 640,
  height = 280,
): string | null {
  if (!token) return null
  // Cap overlays to keep URLs under Mapbox's practical length limit
  const points = crawlStopCoordinates(stops).slice(0, 20)
  if (!points.length) return null

  const pins = points
    .map(([lng, lat], index) => {
      const label = Math.min(index + 1, 99)
      return `pin-s-${label}+ea580c(${lng},${lat})`
    })
    .join(',')

  let overlay = pins
  if (points.length >= 2) {
    const pathCoords = points.map(([lng, lat]) => `${lng},${lat}`).join(';')
    overlay = `path-5+b45309-0.95(${pathCoords}),${pins}`
  }

  const w = Math.round(width)
  const h = Math.round(height)
  const size = `${w}x${h}@2x`

  if (points.length === 1) {
    const [lng, lat] = points[0]
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${overlay}/${lng},${lat},16,0/${size}?access_token=${encodeURIComponent(token)}`
  }

  const { centerLng, centerLat, west, south, east, north } = routeViewport(points)
  const zoom = zoomForSpan(west, south, east, north, w, h)

  // Explicit center+zoom (tighter and more reliable than auto/bbox for short pub routes)
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${overlay}/${centerLng},${centerLat},${zoom},0/${size}?access_token=${encodeURIComponent(token)}`
}
