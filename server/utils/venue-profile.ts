import {
  MAX_VENUE_HEADER_IMAGES,
  VENUE_HEADERS_BUCKET,
  resolveVenueHeaderImageUrl as resolveHeaderUrl,
} from '../../utils/venue-headers'

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X',
  tiktok: 'TikTok',
}

export { MAX_VENUE_HEADER_IMAGES, VENUE_HEADERS_BUCKET }
export const resolveVenueHeaderImageUrl = resolveHeaderUrl

export function sanitizeHeaderImageUrls(urls: unknown): string[] | null {
  if (!Array.isArray(urls)) return null
  const cleaned: string[] = []
  const seen = new Set<string>()
  for (const item of urls) {
    const value = String(item || '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    cleaned.push(value)
    if (cleaned.length >= MAX_VENUE_HEADER_IMAGES) break
  }
  return cleaned.length > 0 ? cleaned : null
}

/** Merge legacy single header URL with the JSON array column. */
export function mergeHeaderImageUrls(profile?: {
  headerImageUrl?: string | null
  headerImageUrls?: unknown
} | null): string[] {
  const fromArray = sanitizeHeaderImageUrls(profile?.headerImageUrls) ?? []
  const legacy = String(profile?.headerImageUrl || '').trim()
  const merged = [...fromArray]
  if (legacy && !merged.includes(legacy)) {
    merged.unshift(legacy)
  }
  return merged.slice(0, MAX_VENUE_HEADER_IMAGES)
}

/** Resolve stored paths to public URLs for display. */
export function resolveVenueHeaderImageUrls(
  profile?: { headerImageUrl?: string | null; headerImageUrls?: unknown } | null,
  supabaseUrl?: string,
): string[] {
  return mergeHeaderImageUrls(profile)
    .map((item) => resolveVenueHeaderImageUrl(item, supabaseUrl))
    .filter(Boolean)
}

/** Storage object path must belong to the venue (e.g. "123/abc.jpg"). */
export function isVenueHeaderStoragePath(path: string, venueId: number): boolean {
  const normalized = String(path || '').trim().replace(/^\/+/, '')
  return normalized.startsWith(`${venueId}/`) && !normalized.includes('..')
}

export function sanitizeSocialLinks(
  links?: Record<string, string | null | undefined> | null,
): Record<string, string> | null {
  if (!links) return null
  const cleaned: Record<string, string> = {}
  for (const [key, value] of Object.entries(links)) {
    const url = String(value || '').trim()
    if (url) cleaned[key] = url
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null
}

export function socialLinksForDisplay(
  links?: Record<string, string> | null,
): Array<{ key: string; label: string; url: string }> {
  const cleaned = sanitizeSocialLinks(links)
  if (!cleaned) return []
  return Object.entries(cleaned).map(([key, url]) => ({
    key,
    label: SOCIAL_LABELS[key] || key,
    url,
  }))
}
