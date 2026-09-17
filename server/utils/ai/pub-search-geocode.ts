export type GeocodedPlace = {
  lat: number
  lng: number
  label: string
}

function mapboxToken() {
  const config = useRuntimeConfig()
  return String(config.public.mapbox_token || process.env.NUXT_PUBLIC_MAPBOX_TOKEN || '').trim()
}

export async function geocodeUkPlace(
  query: string,
  proximity?: { lat: number; lng: number } | null,
): Promise<GeocodedPlace | null> {
  const token = mapboxToken()
  const q = query.replace(/\s+/g, ' ').trim()
  if (!token || q.length < 2) return null

  const params = new URLSearchParams({
    access_token: token,
    country: 'GB',
    limit: '1',
    language: 'en',
    types: 'place,locality,neighborhood,poi,address,district',
  })
  if (proximity && Number.isFinite(proximity.lat) && Number.isFinite(proximity.lng)) {
    params.set('proximity', `${proximity.lng},${proximity.lat}`)
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params}`

  try {
    const data = await $fetch<{
      features?: Array<{
        center?: [number, number]
        place_name?: string
        text?: string
      }>
    }>(url)
    const feature = data.features?.[0]
    const center = feature?.center
    if (!center || center.length < 2) return null
    const lng = Number(center[0])
    const lat = Number(center[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return {
      lat,
      lng,
      label: feature.place_name || feature.text || q,
    }
  } catch (error) {
    console.warn('[ai-pub-search] geocode failed:', error)
    return null
  }
}
