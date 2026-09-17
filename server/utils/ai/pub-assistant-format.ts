import type { PubAssistantLink, PubAssistantLinkType } from '../../../types/pub-assistant'

export const PUB_ASSISTANT_QUESTION_MIN = 3
export const PUB_ASSISTANT_QUESTION_MAX = 500
export const PUB_ASSISTANT_HISTORY_LIMIT = 6

const SAFE_SITE_PATH = /^\/[a-zA-Z0-9/?#=&%._\-]*$/

export function normalisePubQuestion(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim()
}

export function clampPubAssistantLimit(value: unknown, fallback = 8, max = 12): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(1, parsed))
}

export function isSafeSitePath(href: unknown): boolean {
  const path = String(href ?? '').trim()
  if (!path.startsWith('/') || path.startsWith('//')) return false
  return SAFE_SITE_PATH.test(path)
}

export function venueAssistantHref(id: number, slug: string) {
  return `/venues/${id}/${encodeURIComponent(slug || '')}`
}

export function eventAssistantHref(id: number) {
  return `/events/${id}`
}

export function newsAssistantHref(slug: string) {
  return `/news/${encodeURIComponent(slug)}`
}

export function stadiumAssistantHref(slug: string) {
  return `/pubs-near-stadiums/${encodeURIComponent(slug)}`
}

export function assistantLink(
  type: PubAssistantLinkType,
  label: string,
  href: string,
): PubAssistantLink | null {
  const text = String(label || '').trim()
  if (!text || !isSafeSitePath(href)) return null
  return { type, label: text, href }
}

export function collectAssistantLinks(results: unknown[]): PubAssistantLink[] {
  const seen = new Set<string>()
  const links: PubAssistantLink[] = []

  for (const result of results) {
    if (!result || typeof result !== 'object') continue
    const list = (result as { links?: unknown }).links
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const href = String((item as PubAssistantLink).href || '')
      const label = String((item as PubAssistantLink).label || '')
      const type = (item as PubAssistantLink).type
      if (!href || seen.has(href) || !isSafeSitePath(href)) continue
      seen.add(href)
      links.push({
        type: type || 'search',
        label: label || href,
        href,
      })
    }
  }

  return links.slice(0, 12)
}

export function truncateText(value: unknown, max = 400): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return null
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

export function parseVisitorCoordinate(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(n) || n < min || n > max) return null
  return n
}
