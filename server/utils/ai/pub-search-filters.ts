import {
  AI_FEATURE_KEYS,
  AI_PUB_SEARCH_DEFAULT_LIMIT,
  AI_PUB_SEARCH_DEFAULT_RADIUS_MILES,
  AI_PUB_SEARCH_MAX_LIMIT,
  AI_PUB_SEARCH_MAX_RADIUS_MILES,
  AI_PUB_SEARCH_MIN_RADIUS_MILES,
  canonicalAiFeature,
  type AiPubSearchFilters,
} from '../../../utils/ai-pub-search'

const HARD_KEYWORDS = ['historic', 'historical']
const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function cleanPlace(value: unknown): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return null
  return text.slice(0, 120)
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out.slice(0, 8)
}

export function emptyAiFilters(overrides: Partial<AiPubSearchFilters> = {}): AiPubSearchFilters {
  return {
    location: null,
    locationEnd: null,
    nearMe: false,
    radiusMiles: AI_PUB_SEARCH_DEFAULT_RADIUS_MILES,
    limit: AI_PUB_SEARCH_DEFAULT_LIMIT,
    features: [],
    keywords: [],
    makeCrawl: false,
    ...overrides,
  }
}

export function validateAiPubSearchFilters(input: unknown): AiPubSearchFilters {
  const raw = (input && typeof input === 'object') ? input as Record<string, unknown> : {}

  const radiusRaw = Number(raw.radiusMiles ?? raw.radius_miles ?? AI_PUB_SEARCH_DEFAULT_RADIUS_MILES)
  const radiusMiles = Number.isFinite(radiusRaw)
    ? clamp(radiusRaw, AI_PUB_SEARCH_MIN_RADIUS_MILES, AI_PUB_SEARCH_MAX_RADIUS_MILES)
    : AI_PUB_SEARCH_DEFAULT_RADIUS_MILES

  const limitRaw = Number(raw.limit ?? raw.stopCount ?? raw.stop_count ?? AI_PUB_SEARCH_DEFAULT_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.round(clamp(limitRaw, 1, AI_PUB_SEARCH_MAX_LIMIT))
    : AI_PUB_SEARCH_DEFAULT_LIMIT

  const features = uniqueStrings(raw.features)
    .map((feature) => canonicalAiFeature(feature))
    .filter((feature): feature is string => Boolean(feature) && AI_FEATURE_KEYS.includes(feature))
  const uniqueFeatures = [...new Set(features)]

  const keywords = uniqueStrings(raw.keywords).map((word) => word.toLowerCase())

  const makeCrawl = raw.makeCrawl === true || raw.make_crawl === true || raw.crawl === true

  return {
    location: cleanPlace(raw.location),
    locationEnd: cleanPlace(raw.locationEnd ?? raw.location_end ?? raw.locationB),
    nearMe: raw.nearMe === true || raw.near_me === true,
    radiusMiles,
    limit,
    features: uniqueFeatures,
    keywords,
    makeCrawl,
  }
}

function parseCount(question: string): number | null {
  const match = question.match(/\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\s*[- ]?(?:pub|stop)s?\b/i)
  if (!match) return null
  const token = match[1].toLowerCase()
  const fromWord = WORD_NUMBERS[token]
  if (fromWord) return fromWord
  const n = Number.parseInt(token, 10)
  return Number.isFinite(n) ? n : null
}

function pushFeature(features: string[], key: string) {
  if (!features.includes(key)) features.push(key)
}

/**
 * Deterministic filter extraction for suggested queries and OpenAI fallbacks.
 * Never invents SQL — it only produces the same validated filter object the model would.
 */
export function extractHeuristicFilters(question: string): AiPubSearchFilters {
  const text = question.replace(/\s+/g, ' ').trim()
  const lower = text.toLowerCase()
  const filters = emptyAiFilters()

  if (/\bcrawl\b/.test(lower) || /\bpub[- ]?crawl\b/.test(lower)) {
    filters.makeCrawl = true
    filters.limit = 4
    filters.radiusMiles = 1.5
  }

  const count = parseCount(lower)
  if (count) filters.limit = clamp(count, 1, AI_PUB_SEARCH_MAX_LIMIT)

  if (/\b(near me|near here|around me|from here)\b/.test(lower)) filters.nearMe = true

  const milesMatch = lower.match(/\bwithin\s+(\d+(?:\.\d+)?|a half|half|one|two|three|four|five|six|seven|eight|nine|ten)\s*miles?\b/)
    || lower.match(/\b(\d+(?:\.\d+)?)\s*miles?\b/)
  if (milesMatch) {
    const milesToken = milesMatch[1]
    const miles = WORD_NUMBERS[milesToken] ?? (milesToken === 'half' || milesToken === 'a half' ? 0.5 : Number(milesToken))
    if (Number.isFinite(miles)) {
      filters.radiusMiles = clamp(miles, AI_PUB_SEARCH_MIN_RADIUS_MILES, AI_PUB_SEARCH_MAX_RADIUS_MILES)
    }
    if (!filters.location && !/\bbetween\b/.test(lower)) filters.nearMe = true
  }

  if (/\b(garden|gardens|beer garden|outdoor|terrace)\b/.test(lower)) pushFeature(filters.features, 'garden')
  if (/\b(dog|dogs|dog-friendly|dog friendly)\b/.test(lower)) pushFeature(filters.features, 'dogs')
  if (/\b(family|families|kids?|children)\b/.test(lower)) pushFeature(filters.features, 'family')
  if (/\b(food|lunch|roast|sunday lunch|kitchen|meals?)\b/.test(lower)) pushFeature(filters.features, 'food')
  if (/\b(real ale|craft beer|camra)\b/.test(lower)) pushFeature(filters.features, 'ale')
  if (/\b(live music|gig)\b/.test(lower)) pushFeature(filters.features, 'music')

  if (/\bsunday\s+(lunch|roast)\b/.test(lower)) filters.keywords.push('sunday lunch')
  if (/\bhistoric|historical|grade\s*ii|coaching inn\b/.test(lower)) filters.keywords.push('historic')
  if (/\btraditional\b/.test(lower)) filters.keywords.push('traditional')

  const between = text.match(/\bbetween\s+(.+?)\s+and\s+(.+?)$/i)
  if (between) {
    filters.location = cleanPlace(between[1].replace(/\b(historic|traditional|pubs?)\b/gi, ''))
    filters.locationEnd = cleanPlace(between[2].replace(/\b(historic|traditional|pubs?)\b/gi, ''))
    filters.nearMe = false
  } else {
    const near = text.match(/\b(?:near|around|in|at)\s+(.+)$/i)
    if (near) {
      const place = cleanPlace(
        near[1]
          .replace(/\b(suitable for families|for families|with gardens?|serving sunday lunch)\b/gi, '')
          .replace(/\b(pubs?|traditional|historic)\b/gi, ''),
      )
      if (place && !/\bme\b/i.test(place)) {
        filters.location = place
        filters.nearMe = false
      }
    }
  }

  return validateAiPubSearchFilters(filters)
}

export function isHardKeyword(keyword: string) {
  const value = keyword.toLowerCase()
  return HARD_KEYWORDS.some((item) => value.includes(item))
}
