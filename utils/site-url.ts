/** Production-safe site URL for SEO, sitemap, and canonical links. */
export function resolveSiteUrl(): string {
  const candidates = [
    process.env.NUXT_SITE_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NUXT_PUBLIC_APP_URL,
    process.env.BASE_URL,
  ]

  for (const raw of candidates) {
    if (!raw) continue
    const url = raw.replace(/\/$/, '')
    if (isLocalSiteUrl(url)) continue
    return url
  }

  return 'https://ukpubs.co.uk'
}

export function isLocalSiteUrl(value: string): boolean {
  return /127\.0\.0\.1|localhost/i.test(value)
}

/** Prefer configured production URL; on live site use current host; never share localhost. */
export function canonicalSiteUrl(preferred?: string): string {
  const normalized = preferred?.replace(/\/$/, '')
  if (normalized && !isLocalSiteUrl(normalized)) {
    return normalized
  }

  if (import.meta.client && typeof window !== 'undefined') {
    const { protocol, hostname, host } = window.location
    if (hostname && !isLocalSiteUrl(hostname)) {
      return `${protocol}//${host}`.replace(/\/$/, '')
    }
  }

  return 'https://ukpubs.co.uk'
}

export function canonicalPageUrl(path: string, base?: string): string {
  const site = base || canonicalSiteUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${site}${normalizedPath}`
}

/** Resolve a share URL from an optional full URL or site-relative path. */
export function resolveShareUrl(pathOrUrl: string, preferredBase?: string): string {
  const trimmed = pathOrUrl.trim()
  if (!trimmed) return canonicalSiteUrl(preferredBase)

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      if (!isLocalSiteUrl(parsed.hostname)) {
        return parsed.toString().replace(/\/$/, '') || trimmed
      }
      return canonicalPageUrl(parsed.pathname, preferredBase)
    } catch {
      return canonicalPageUrl(trimmed, preferredBase)
    }
  }

  return canonicalPageUrl(trimmed, preferredBase)
}
