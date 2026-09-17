import { buildCrawlLegs, haversineMiles } from '../../../utils/crawl-distance'
import type { AiPubCrawl, AiPubResult } from '../../../utils/ai-pub-search'
import type { GeocodedPlace } from './pub-search-geocode'

function mapboxToken() {
  const config = useRuntimeConfig()
  return String(config.public.mapbox_token || process.env.NUXT_PUBLIC_MAPBOX_TOKEN || '').trim()
}

function crawlName(filtersLocation: string | null, pubs: AiPubResult[]) {
  const town = filtersLocation || pubs[0]?.town
  if (town) return `${pubs.length}-pub crawl around ${town}`
  return `${pubs.length}-pub crawl`
}

function greedyOrder(pubs: AiPubResult[], origin: GeocodedPlace | null) {
  if (pubs.length <= 1) return pubs.slice()

  const remaining = pubs.slice()
  const ordered: AiPubResult[] = []

  let current: { lat: number; lng: number }
  if (origin) {
    current = origin
  } else {
    const start = remaining.shift()!
    ordered.push(start)
    current = { lat: start.latitude, lng: start.longitude }
  }

  while (remaining.length) {
    let bestIndex = 0
    let bestMiles = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const pub = remaining[i]
      const miles = haversineMiles(current.lat, current.lng, pub.latitude, pub.longitude)
      if (miles < bestMiles) {
        bestMiles = miles
        bestIndex = i
      }
    }
    const next = remaining.splice(bestIndex, 1)[0]
    ordered.push(next)
    current = { lat: next.latitude, lng: next.longitude }
  }

  return ordered
}

function coordsPath(pubs: AiPubResult[]) {
  return pubs
    .map((pub) => `${pub.longitude},${pub.latitude}`)
    .join(';')
}

async function optimizedTripOrder(pubs: AiPubResult[]) {
  const token = mapboxToken()
  if (!token || pubs.length < 2) return null

  const url =
    `https://api.mapbox.com/optimized-trips/v1/mapbox/walking/${coordsPath(pubs)}`
    + `?source=first&destination=any&roundtrip=false&geometries=geojson&overview=full`
    + `&access_token=${encodeURIComponent(token)}`

  try {
    const data = await $fetch<{
      waypoints?: Array<{ waypoint_index?: number }>
      trips?: Array<{ geometry?: { coordinates?: [number, number][] } }>
    }>(url)
    const waypoints = data.waypoints
    if (!waypoints?.length || waypoints.length !== pubs.length) return null

    const ordered = waypoints
      .map((waypoint, index) => ({ index, order: waypoint.waypoint_index ?? index }))
      .sort((a, b) => a.order - b.order)
      .map((item) => pubs[item.index])
      .filter(Boolean)

    if (ordered.length !== pubs.length) return null
    return {
      pubs: ordered,
      route: data.trips?.[0]?.geometry?.coordinates || null,
    }
  } catch (error) {
    console.warn('[ai-pub-search] optimized trip failed:', error)
    return null
  }
}

async function walkingRoute(pubs: AiPubResult[]): Promise<[number, number][] | null> {
  const token = mapboxToken()
  if (!token || pubs.length < 2) return null

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coordsPath(pubs)}`
    + `?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`

  try {
    const data = await $fetch<{
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>
    }>(url)
    const geometry = data.routes?.[0]?.geometry?.coordinates
    return geometry?.length ? geometry : null
  } catch (error) {
    console.warn('[ai-pub-search] walking directions failed:', error)
    return null
  }
}

export async function orderPubsIntoCrawl(
  pubs: AiPubResult[],
  origin: GeocodedPlace | null,
  locationLabel?: string | null,
): Promise<{ pubs: AiPubResult[]; crawl: AiPubCrawl }> {
  const withCoords = pubs.filter((pub) => Number.isFinite(pub.latitude) && Number.isFinite(pub.longitude))
  const greedy = greedyOrder(withCoords, origin)
  const optimized = await optimizedTripOrder(greedy)
  const ordered = optimized?.pubs || greedy
  const route = optimized?.route || await walkingRoute(ordered)

  const legs = buildCrawlLegs(
    ordered.map((pub) => ({ latitude: pub.latitude, longitude: pub.longitude })),
  ).map((leg) => ({
    fromIndex: leg.fromIndex,
    toIndex: leg.toIndex,
    miles: leg.miles,
    label: leg.label,
  }))

  const totalMiles = legs.reduce((sum, leg) => sum + (leg.miles ?? 0), 0)
  const totalWalkLabel = totalMiles
    ? `Total ~${totalMiles < 10 ? totalMiles.toFixed(1) : Math.round(totalMiles)} mi walking`
    : null

  return {
    pubs: ordered,
    crawl: {
      name: crawlName(locationLabel || origin?.label || null, ordered),
      ordered: true,
      totalWalkLabel,
      legs,
      route,
    },
  }
}
