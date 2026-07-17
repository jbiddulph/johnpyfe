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

/**
 * Mapbox Static Images URL zoomed to the crawl route (path + numbered pins).
 * Uses `auto` framing so the camera fits all venues.
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
    overlay = `path-4+b45309-0.9(${pathCoords}),${pins}`
  }

  const size = `${Math.round(width)}x${Math.round(height)}@2x`
  if (points.length === 1) {
    const [lng, lat] = points[0]
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${overlay}/${lng},${lat},14,0/${size}?access_token=${encodeURIComponent(token)}`
  }

  return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${overlay}/auto/${size}?padding=56&access_token=${encodeURIComponent(token)}`
}
