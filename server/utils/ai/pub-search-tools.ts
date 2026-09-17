import type { AiPubResult, AiPubSearchFilters } from '../../../utils/ai-pub-search'
import { validateAiPubSearchFilters } from './pub-search-filters'
import { geocodeUkPlace, type GeocodedPlace } from './pub-search-geocode'
import { getVerifiedPubDetails, loadPubsByIds, searchPubsFromFilters } from './pub-search-query'
import { orderPubsIntoCrawl } from './pub-search-crawl'
import type { AiPubCrawl } from '../../../utils/ai-pub-search'

export type UserLocation = { lat: number; lng: number } | null

export type ToolExecutionState = {
  filters: AiPubSearchFilters | null
  pubs: AiPubResult[]
  crawl: AiPubCrawl | null
  origin: GeocodedPlace | null
  details: Awaited<ReturnType<typeof getVerifiedPubDetails>>[]
}

export const PUB_SEARCH_TOOLS = [
  {
    type: 'function' as const,
    name: 'search_pubs',
    description:
      'Search the UK Pubs database using a location, walking radius and facilities. Returns real matching pubs only. Use this for natural-language pub finding. Do not invent pubs.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'UK town, station or place name, e.g. Worthing or Brighton station. Omit when the user said near me.',
        },
        locationEnd: {
          type: 'string',
          description: 'Second place when the user asked for pubs between two towns, e.g. Shoreham.',
        },
        nearMe: {
          type: 'boolean',
          description: 'True when the user asked for pubs near their current location.',
        },
        radiusMiles: {
          type: 'number',
          description: 'Search radius in miles. Default 3. Clamp between 0.25 and 25.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum pubs to return (1-12). Use 3-5 for crawls.',
        },
        features: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Facility keys: garden, dogs, music, food, sport, ale, family, wifi, parking, accessible, quiz, rooms. Aliases such as family_friendly and dog_friendly are accepted.',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Extra terms such as traditional, historic, or sunday lunch.',
        },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function' as const,
    name: 'get_pub_details',
    description:
      'Retrieve one pub’s verified listing from the UK Pubs database. Use after search_pubs when the user asks about a specific result.',
    parameters: {
      type: 'object',
      properties: {
        venueId: {
          type: 'integer',
          description: 'Numeric venue id returned by search_pubs.',
        },
      },
      required: ['venueId'],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function' as const,
    name: 'create_pub_crawl',
    description:
      'Select matching pubs from the database and order them into a walking crawl using Mapbox. Does not save the crawl or update any records. Use when the user asks for a pub crawl or a numbered set of stops.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        locationEnd: { type: 'string' },
        nearMe: { type: 'boolean' },
        radiusMiles: { type: 'number' },
        stopCount: {
          type: 'integer',
          description: 'How many pubs to include (2-8). Default 4.',
        },
        features: {
          type: 'array',
          items: { type: 'string' },
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
        },
        venueIds: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Optional existing search result ids to order instead of searching again.',
        },
      },
      additionalProperties: false,
    },
    strict: false,
  },
]

async function resolveOrigin(
  filters: AiPubSearchFilters,
  userLocation: UserLocation,
): Promise<{ origin: GeocodedPlace | null; end: GeocodedPlace | null; error?: string }> {
  if (filters.nearMe) {
    if (!userLocation) {
      return {
        origin: null,
        end: null,
        error: 'Share your location to search for pubs near you.',
      }
    }
    return {
      origin: { lat: userLocation.lat, lng: userLocation.lng, label: 'Your location' },
      end: filters.locationEnd
        ? await geocodeUkPlace(filters.locationEnd, userLocation)
        : null,
    }
  }

  const origin = filters.location
    ? await geocodeUkPlace(filters.location, userLocation)
    : userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, label: 'Your location' }
      : null
  const end = filters.locationEnd
    ? await geocodeUkPlace(filters.locationEnd, origin || userLocation)
    : null

  if ((filters.location || filters.locationEnd) && !origin && !end && !filters.location) {
    return { origin: null, end: null, error: 'Could not find that place in the UK.' }
  }

  return { origin, end }
}

export async function executeSearchPubs(
  args: unknown,
  userLocation: UserLocation,
  state: ToolExecutionState,
) {
  const filters = validateAiPubSearchFilters(args)
  const { origin, end, error } = await resolveOrigin(filters, userLocation)
  if (error) {
    state.filters = filters
    return { error, pubs: [] as AiPubResult[], filters }
  }

  if (!origin && !filters.location) {
    return {
      error: 'Please include a town or share your location so the search has a centre point.',
      pubs: [] as AiPubResult[],
      filters,
    }
  }

  const pubs = await searchPubsFromFilters(filters, origin, end)
  state.filters = filters
  state.pubs = pubs
  state.origin = origin
  state.crawl = null

  return {
    filters,
    origin: origin?.label || null,
    count: pubs.length,
    pubs: pubs.map((pub) => ({
      id: pub.id,
      name: pub.name,
      town: pub.town,
      county: pub.county,
      distanceMiles: pub.distanceMiles,
      matchedFeatures: pub.matchedFeatures,
      latitude: pub.latitude,
      longitude: pub.longitude,
    })),
  }
}

export async function executeGetPubDetails(args: unknown, state: ToolExecutionState) {
  const venueId = Number.parseInt(String((args as { venueId?: unknown })?.venueId ?? ''), 10)
  const details = await getVerifiedPubDetails(venueId)
  if (!details) {
    return { error: 'That pub was not found in the UK Pubs database.' }
  }
  state.details.push(details)
  if (!state.pubs.some((pub) => pub.id === details.id)) {
    state.pubs = [...state.pubs, details]
  }
  return details
}

export async function executeCreatePubCrawl(
  args: unknown,
  userLocation: UserLocation,
  state: ToolExecutionState,
) {
  const raw = (args && typeof args === 'object') ? args as Record<string, unknown> : {}
  const venueIds = Array.isArray(raw.venueIds)
    ? raw.venueIds.map((id) => Number.parseInt(String(id), 10)).filter((id) => Number.isFinite(id))
    : []

  let pubs: AiPubResult[]
  let filters = validateAiPubSearchFilters({
    ...raw,
    limit: raw.stopCount ?? raw.limit ?? 4,
    makeCrawl: true,
  })

  if (venueIds.length >= 2) {
    pubs = await loadPubsByIds(venueIds)
    filters = { ...filters, makeCrawl: true, limit: pubs.length }
  } else {
    const searched = await executeSearchPubs({ ...raw, limit: filters.limit, makeCrawl: true }, userLocation, state)
    if ('error' in searched && searched.error && !searched.pubs?.length) {
      return searched
    }
    pubs = state.pubs
  }

  if (pubs.length < 2) {
    state.filters = filters
    state.pubs = pubs
    return {
      error: pubs.length
        ? 'Need at least two matching pubs to build a crawl.'
        : 'No matching pubs were found to build a crawl.',
      pubs,
      filters,
    }
  }

  const origin = state.origin
    || (userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, label: 'Your location' }
      : null)
  const ordered = await orderPubsIntoCrawl(pubs.slice(0, filters.limit), origin, filters.location || origin?.label)
  state.filters = filters
  state.pubs = ordered.pubs
  state.crawl = ordered.crawl

  return {
    filters,
    crawl: {
      name: ordered.crawl.name,
      totalWalkLabel: ordered.crawl.totalWalkLabel,
      ordered: true,
      stops: ordered.pubs.map((pub, index) => ({
        stop: index + 1,
        id: pub.id,
        name: pub.name,
        town: pub.town,
      })),
    },
  }
}

export async function executeToolCall(
  name: string,
  argsJson: string,
  userLocation: UserLocation,
  state: ToolExecutionState,
) {
  let args: unknown = {}
  try {
    args = argsJson ? JSON.parse(argsJson) : {}
  } catch {
    return { error: 'Invalid function arguments.' }
  }

  if (name === 'search_pubs') return executeSearchPubs(args, userLocation, state)
  if (name === 'get_pub_details') return executeGetPubDetails(args, state)
  if (name === 'create_pub_crawl') return executeCreatePubCrawl(args, userLocation, state)
  return { error: `Unknown function ${name}` }
}
