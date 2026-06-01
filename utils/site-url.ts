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
    if (url.includes('127.0.0.1') || url.includes('localhost')) continue
    return url
  }

  return 'https://ukpubs.co.uk'
}
