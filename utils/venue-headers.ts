export const VENUE_HEADERS_BUCKET = 'venue_headers'
export const MAX_VENUE_HEADER_IMAGES = 10

/** Build a public URL for a venue_headers bucket object or pass through absolute URLs. */
export function resolveVenueHeaderImageUrl(pathOrUrl: string, supabaseUrl?: string): string {
  const value = String(pathOrUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value

  const base = String(supabaseUrl || '').replace(/\/$/, '')
  if (!base) return value

  const normalized = value.replace(/^\/+/, '')
  if (normalized.startsWith(`${VENUE_HEADERS_BUCKET}/`)) {
    return `${base}/storage/v1/object/public/${normalized}`
  }
  return `${base}/storage/v1/object/public/${VENUE_HEADERS_BUCKET}/${normalized}`
}
