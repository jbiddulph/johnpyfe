/** Normalise messy DB string values ("NULL", empty, etc.). */
export function cleanDbString(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s || s.toUpperCase() === 'NULL') return null
  return s
}

/** Title-style label for breadcrumbs and headings. */
export function formatPlaceName(value: unknown): string {
  const s = cleanDbString(value)
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function slugifyPlace(value: unknown): string {
  const s = cleanDbString(value)
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Map canonical City names to preferred town hub slugs (e.g. Brighton & Hove → brighton). */
const CITY_HUB_SLUG_OVERRIDES: Record<string, string> = {
  'brighton & hove': 'brighton',
}

export function cityHubSlug(cityName: string, citySlug?: string): string {
  const override = CITY_HUB_SLUG_OVERRIDES[cityName.trim().toLowerCase()]
  if (override) return override
  return citySlug ?? slugifyPlace(cityName)
}

export function isValidPhone(value: unknown): boolean {
  const s = cleanDbString(value)
  if (!s) return false
  const digits = s.replace(/\D/g, '')
  if (!digits || /^0+$/.test(digits)) return false
  return digits.length >= 6
}

export function formatPhone(value: unknown): string | null {
  if (!isValidPhone(value)) return null
  return cleanDbString(value)
}

/** Reject address-like junk stored in the town column. Town names must not start with a digit. */
export function isPlausibleTownName(value: unknown): boolean {
  const s = cleanDbString(value)
  if (!s) return false
  if (/^\d/.test(s)) return false
  if (s.length > 40) return false
  if (/[,.]/.test(s)) return false
  const lower = s.toLowerCase()
  if (/\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|way|place|pl|hill|terrace|crescent|close)\b/.test(lower)) {
    return false
  }
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 4) return false
  return true
}

/** Reject address-like junk stored in the county column (basic sanity only). */
export function isPlausibleCountyName(value: unknown): boolean {
  const s = cleanDbString(value)
  if (!s) return false
  if (/\d/.test(s)) return false
  if (s.length > 40) return false
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length > 4) return false
  return true
}

export function isValidWebsite(value: unknown): boolean {
  const s = cleanDbString(value)
  if (!s) return false
  return s.startsWith('http://') || s.startsWith('https://')
}

/** Display href for a website field that may omit the scheme. */
export function normalizeWebsiteHref(value: unknown): string | null {
  const s = cleanDbString(value)
  if (!s) return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.includes('.') && !s.includes(' ')) return `https://${s}`
  return null
}

/** Parse stored bullet features (newline-separated, optional • prefix) into list items. */
export function parseVenueFeatures(value: unknown): string[] {
  const s = cleanDbString(value)
  if (!s) return []
  return s
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean)
}

export function parseVenueCoord(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

export function venueHasCoords(venue: { latitude?: unknown; longitude?: unknown } | null | undefined): boolean {
  if (!venue) return false
  return parseVenueCoord(venue.latitude) != null && parseVenueCoord(venue.longitude) != null
}

/** Human-readable straight-line distance for nearby venue cards. */
export function formatDistanceMiles(miles: number | null | undefined): string {
  const m = Number(miles)
  if (!Number.isFinite(m) || m < 0) return ''
  if (m < 0.05) return 'Less than 0.1 mile'
  const rounded = m < 10 ? m.toFixed(1) : Math.round(m).toString()
  const n = Number.parseFloat(rounded)
  return `${rounded} mile${n === 1 ? '' : 's'}`
}

type VenuePhotoConfig = {
  venueImgFolder?: string
  supabaseUrl?: string
}

const DEFAULT_VENUE_PHOTO_MARKERS = [
  'standing.jpg',
  'awaiting.jpg',
  'images/venues/awaiting',
]

/** Broken Google Place Photo CDN URLs (often 403 when hotlinked). */
const BROKEN_VENUE_PHOTO_PREFIXES = [
  'https://lh3.googleusercontent.com/place-photos/',
]

/** Fallback hero/card image when a venue has no photo. */
export const DEFAULT_VENUE_IMAGE = '/assets/images/filip-andrejevic-QmX5lw8StoQ-unsplash.jpg'

/** True for missing photos and generic placeholder images (e.g. standing.jpg). */
export function isDefaultVenuePhoto(photo: unknown): boolean {
  const p = cleanDbString(photo)
  if (!p) return true
  const lower = p.toLowerCase()
  return DEFAULT_VENUE_PHOTO_MARKERS.some((marker) => lower.includes(marker))
}

/** True for known-broken remote photo hosts (e.g. Google Place Photos CDN). */
export function isBrokenVenuePhoto(photo: unknown): boolean {
  const p = cleanDbString(photo)
  if (!p) return false
  return BROKEN_VENUE_PHOTO_PREFIXES.some((prefix) => p.startsWith(prefix))
}

/** Returns a usable image URL, or null for placeholders / missing / broken photos. */
export function resolveVenuePhotoUrl(photo: unknown, config: VenuePhotoConfig = {}): string | null {
  if (isDefaultVenuePhoto(photo) || isBrokenVenuePhoto(photo)) return null

  const p = cleanDbString(photo)!

  if (p.startsWith('http://') || p.startsWith('https://')) return p

  if (p.startsWith('public/') && config.supabaseUrl) {
    const base = config.supabaseUrl.replace(/\/$/, '')
    return `${base}/storage/v1/object/public/venue_images/${p}`
  }

  const folder = config.venueImgFolder || ''
  if (folder) return `${folder}${p}`
  if (p.startsWith('/')) return p
  return null
}

/** Returns a display URL, falling back to the site default venue image. */
export function resolveVenueDisplayPhotoUrl(photo: unknown, config: VenuePhotoConfig = {}): string {
  return resolveVenuePhotoUrl(photo, config) ?? DEFAULT_VENUE_IMAGE
}

export function venueStaticMapUrl(
  venue: { latitude?: unknown; longitude?: unknown },
  token: string,
  width = 400,
  height = 200,
): string | null {
  const lat = parseVenueCoord(venue.latitude)
  const lng = parseVenueCoord(venue.longitude)
  if (lat == null || lng == null || !token) return null
  const pin = `pin-s+ea580c(${lng},${lat})`
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${pin}/${lng},${lat},14,0/${width}x${height}@2x?access_token=${encodeURIComponent(token)}`
}
