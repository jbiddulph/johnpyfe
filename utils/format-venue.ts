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

/** Reject address-like junk stored in the town column. */
export function isPlausibleTownName(value: unknown): boolean {
  const s = cleanDbString(value)
  if (!s) return false
  if (/\d/.test(s)) return false
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

/** Reject address-like junk stored in the county column. */
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
