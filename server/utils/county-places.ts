const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const SEARCH_FIELD_MASK = 'places.name,places.displayName,places.formattedAddress,places.types'
const DETAILS_FIELD_MASK = 'displayName,photos'

type PlacePhoto = {
  name?: string
  authorAttributions?: Array<{ displayName?: string }>
}

type PlaceDetails = {
  name?: string
  displayName?: { text?: string }
  photos?: PlacePhoto[]
}

function clean(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function countySearchQuery(displayName: string): string {
  return `${displayName} county UK landmarks`
}

async function placeDetails(apiKey: string, placeName: string): Promise<PlaceDetails | null> {
  const response = await fetch(`https://places.googleapis.com/v1/${placeName}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': DETAILS_FIELD_MASK,
    },
  })

  if (!response.ok) {
    throw new Error(`Place Details ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }

  return response.json()
}

async function searchCountyPlace(apiKey: string, displayName: string): Promise<PlaceDetails | null> {
  const response = await fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: countySearchQuery(displayName),
      regionCode: 'GB',
      maxResultCount: 1,
    }),
  })

  if (!response.ok) {
    throw new Error(`Places Search ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }

  const data = await response.json()
  const placeName = data?.places?.[0]?.name
  if (!placeName) return null

  return placeDetails(apiKey, placeName)
}

async function resolvePhotoUrl(apiKey: string, photoName: string): Promise<string | null> {
  const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`)
  url.searchParams.set('maxHeightPx', '800')
  url.searchParams.set('maxWidthPx', '1200')

  const response = await fetch(url.toString(), {
    headers: { 'X-Goog-Api-Key': apiKey },
    redirect: 'manual',
  })

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location')
    if (location && !location.toLowerCase().includes('key=')) {
      return location.slice(0, 2000)
    }
    return null
  }

  return null
}

function photoAttribution(place: PlaceDetails | null): string | null {
  const attrs = place?.photos?.[0]?.authorAttributions
  return clean(attrs?.[0]?.displayName)
}

/** Fetch a representative county photo from Google Places (New). */
export async function fetchCountyPhotoFromPlaces(
  displayName: string,
  apiKey: string,
): Promise<{ photoUrl: string; attribution: string | null } | null> {
  if (!apiKey.trim()) return null

  const place = await searchCountyPlace(apiKey, displayName)
  const photoName = place?.photos?.[0]?.name
  if (!photoName) return null

  const photoUrl = await resolvePhotoUrl(apiKey, photoName)
  if (!photoUrl) return null

  return {
    photoUrl,
    attribution: photoAttribution(place),
  }
}

export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}
