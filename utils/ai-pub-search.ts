import { MAP_FEATURE_FLAGS } from './map-filters'

export const AI_PUB_SEARCH_PLACEHOLDER =
  'Traditional pubs with gardens near Worthing suitable for families'

export const AI_PUB_SEARCH_SUGGESTIONS = [
  'Create a four-pub crawl around Brighton station',
  'Dog-friendly pubs serving Sunday lunch near me',
  'Pubs with gardens within three miles',
  'Historic pubs between Worthing and Shoreham',
] as const

export const AI_ANON_DAILY_LIMIT = 8
export const AI_AUTH_DAILY_LIMIT = 20
export const AI_PUB_SEARCH_MAX_LIMIT = 12
export const AI_PUB_SEARCH_DEFAULT_LIMIT = 8
export const AI_PUB_SEARCH_DEFAULT_RADIUS_MILES = 3
export const AI_PUB_SEARCH_MAX_RADIUS_MILES = 25
export const AI_PUB_SEARCH_MIN_RADIUS_MILES = 0.25
export const AI_PUB_SEARCH_LAST_KEY = 'ukpubs_ai_search_last'

export const AI_FEATURE_KEYS = MAP_FEATURE_FLAGS.map((flag) => flag.key)

const FEATURE_ALIASES: Record<string, string> = {
  family_friendly: 'family',
  familyfriendly: 'family',
  families: 'family',
  kids: 'family',
  children: 'family',
  child_friendly: 'family',
  dog_friendly: 'dogs',
  dogfriendly: 'dogs',
  dog: 'dogs',
  dogs: 'dogs',
  garden: 'garden',
  beer_garden: 'garden',
  beergarden: 'garden',
  outdoor: 'garden',
  outdoors: 'garden',
  terrace: 'garden',
  courtyard: 'garden',
  food: 'food',
  sunday_lunch: 'food',
  sunday_roast: 'food',
  meals: 'food',
  kitchen: 'food',
  live_music: 'music',
  music: 'music',
  sport: 'sport',
  sports: 'sport',
  sky_sports: 'sport',
  ale: 'ale',
  real_ale: 'ale',
  craft: 'ale',
  craft_beer: 'ale',
  wifi: 'wifi',
  'wi-fi': 'wifi',
  parking: 'parking',
  car_park: 'parking',
  accessible: 'accessible',
  wheelchair: 'accessible',
  quiz: 'quiz',
  quiz_night: 'quiz',
  rooms: 'rooms',
  accommodation: 'rooms',
  hotel: 'rooms',
}

export function canonicalAiFeature(value: string | null | undefined): string | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[&/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!raw) return null
  if (AI_FEATURE_KEYS.includes(raw)) return raw
  return FEATURE_ALIASES[raw] || null
}

export type AiPubSearchFilters = {
  location: string | null
  locationEnd: string | null
  nearMe: boolean
  radiusMiles: number
  limit: number
  features: string[]
  keywords: string[]
  makeCrawl: boolean
}

export type AiPubResult = {
  id: number
  slug: string
  name: string
  address: string | null
  town: string | null
  county: string | null
  postcode: string | null
  latitude: number
  longitude: number
  photo: string | null
  features: string[]
  distanceMiles: number | null
  matchedFeatures: string[]
}

export type AiPubCrawlLeg = {
  fromIndex: number
  toIndex: number
  miles: number | null
  label: string
}

export type AiPubCrawl = {
  name: string
  ordered: boolean
  totalWalkLabel: string | null
  legs: AiPubCrawlLeg[]
  route: [number, number][] | null
}

export type AiPubSearchResponse = {
  answer: string
  pubs: AiPubResult[]
  crawl: AiPubCrawl | null
  filters: AiPubSearchFilters | null
  remainingSearches: number
  dailyLimit: number
  usedAi: boolean
}
