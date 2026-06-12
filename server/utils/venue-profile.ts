const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X',
  tiktok: 'TikTok',
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
