/**
 * Shared definitions for the interactive map filters. The map API packs each
 * venue's amenities into a bitmask (`f`) so the ~40k-point payload stays small;
 * the map page decodes it with the same table.
 */

export type MapFeatureFlag = {
  key: string
  label: string
  bit: number
  icon: string
  /** Case-insensitive patterns matched against the venue's features text. */
  patterns: RegExp[]
}

export const MAP_FEATURE_FLAGS: MapFeatureFlag[] = [
  { key: 'garden', label: 'Beer garden / outdoor', bit: 0, icon: 'i-heroicons-sun-20-solid', patterns: [/beer\s*garden/i, /outdoor/i, /outside\s*(seating|area)/i, /terrace/i, /courtyard/i, /al\s*fresco/i] },
  { key: 'dogs', label: 'Dog friendly', bit: 1, icon: 'i-heroicons-heart-20-solid', patterns: [/dog/i] },
  { key: 'music', label: 'Live music', bit: 2, icon: 'i-heroicons-musical-note-20-solid', patterns: [/live\s*music/i, /live\s*band/i, /gig/i, /karaoke/i, /dj\b/i, /open\s*mic/i] },
  { key: 'food', label: 'Food served', bit: 3, icon: 'i-heroicons-cake-20-solid', patterns: [/food/i, /kitchen/i, /menu/i, /sunday\s*roast/i, /restaurant/i, /dining/i, /meals?/i, /pizza/i, /burger/i] },
  { key: 'sport', label: 'Live sport', bit: 4, icon: 'i-heroicons-tv-20-solid', patterns: [/sport/i, /sky\s*sports?/i, /\bbt\s*sport/i, /\btnt\b/i, /big\s*screen/i, /football/i, /rugby/i, /match\s*day/i] },
  { key: 'ale', label: 'Real ale / craft beer', bit: 5, icon: 'i-heroicons-beaker-20-solid', patterns: [/real\s*ale/i, /cask/i, /craft\s*(beer|ale)/i, /camra/i, /micro\s*brew/i, /brewery/i] },
  { key: 'family', label: 'Family friendly', bit: 6, icon: 'i-heroicons-user-group-20-solid', patterns: [/family/i, /child/i, /kids?\b/i, /play\s*area/i] },
  { key: 'wifi', label: 'Free Wi‑Fi', bit: 7, icon: 'i-heroicons-wifi-20-solid', patterns: [/wi-?fi/i, /wireless/i] },
  { key: 'parking', label: 'Parking', bit: 8, icon: 'i-heroicons-truck-20-solid', patterns: [/parking/i, /car\s*park/i] },
  { key: 'accessible', label: 'Accessible', bit: 9, icon: 'i-heroicons-hand-raised-20-solid', patterns: [/wheelchair/i, /accessib/i, /disabled\s*access/i, /step[-\s]*free/i] },
  { key: 'quiz', label: 'Quiz night', bit: 10, icon: 'i-heroicons-question-mark-circle-20-solid', patterns: [/quiz/i] },
  { key: 'rooms', label: 'Rooms / accommodation', bit: 11, icon: 'i-heroicons-home-modern-20-solid', patterns: [/accommodation/i, /rooms?\b/i, /b&b/i, /bed\s*and\s*breakfast/i, /hotel/i, /stay/i] },
]

/** Non-amenity flags packed into the same bitmask. */
export const MAP_META_FLAGS = {
  hasPhoto: 20,
  hasEvents: 21,
  hasWebsite: 22,
  hasDescription: 23,
} as const

export function flagBit(bit: number) {
  return 1 << bit
}

export function hasFlag(mask: number | undefined | null, bit: number) {
  return Boolean(((mask ?? 0) >>> 0) & flagBit(bit))
}

/** Bitmask of amenity flags detected in a venue's free-text features list. */
export function featureFlagsFromText(features: string | null | undefined): number {
  const text = String(features ?? '')
  if (!text.trim()) return 0
  let mask = 0
  for (const flag of MAP_FEATURE_FLAGS) {
    if (flag.patterns.some((pattern) => pattern.test(text))) mask |= flagBit(flag.bit)
  }
  return mask
}

export function normaliseVenueType(value: string | null | undefined): string {
  const text = String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text || text.toLowerCase() === 'null') return 'Other'
  return text
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
}

export const MAP_NEAR_ME_RADII = [
  { value: 0, label: 'Any distance' },
  { value: 0.5, label: 'Within ½ mile' },
  { value: 1, label: 'Within 1 mile' },
  { value: 3, label: 'Within 3 miles' },
  { value: 5, label: 'Within 5 miles' },
  { value: 10, label: 'Within 10 miles' },
]

export type MapVenuePoint = {
  id: number
  fsaId: number
  name: string
  lat: number
  lng: number
  /** Index into the legend's `types` array. */
  t?: number
  /** Bitmask, see MAP_FEATURE_FLAGS / MAP_META_FLAGS. */
  f?: number
}

export type MapVenueFilters = {
  venueName: string
  venueType: string
  features: string[]
  hasEvents: boolean
  hasPhoto: boolean
  nearMeMiles: number
}

export const EMPTY_MAP_FILTERS: MapVenueFilters = {
  venueName: '',
  venueType: '',
  features: [],
  hasEvents: false,
  hasPhoto: false,
  nearMeMiles: 0,
}

export function countActiveMapFilters(filters: MapVenueFilters) {
  let count = 0
  if (filters.venueName && filters.venueName.toUpperCase() !== 'VENUES') count += 1
  if (filters.venueType) count += 1
  count += filters.features.length
  if (filters.hasEvents) count += 1
  if (filters.hasPhoto) count += 1
  if (filters.nearMeMiles > 0) count += 1
  return count
}

/** Human-readable distance from the user to a venue. */
export function formatDistanceFromYou(miles: number) {
  if (!Number.isFinite(miles) || miles < 0) return ''
  if (miles < 0.1) return `${Math.round(miles * 1760)} yd from you`
  const label = miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()
  const mins = Math.round((miles / 3.1) * 60)
  return miles <= 3 ? `${label} mi from you · ~${mins} min walk` : `${label} mi from you`
}
