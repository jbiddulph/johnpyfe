import type { H3Event } from 'h3'
import { getRequestURL } from 'h3'
import { isLocalSiteUrl } from '../../utils/site-url'

/** Public site origin for Stripe return URLs — never localhost on production. */
export function billingSiteUrl(event: H3Event): string {
  try {
    const requestUrl = getRequestURL(event)
    const origin = `${requestUrl.protocol}//${requestUrl.host}`.replace(/\/$/, '')
    if (!isLocalSiteUrl(origin)) {
      return origin
    }
  } catch {
    // fall through to configured URL
  }

  const config = useRuntimeConfig()
  const candidates = [
    process.env.NUXT_SITE_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    String(config.public.appURL || ''),
    String(config.public.baseURL || ''),
  ]

  for (const raw of candidates) {
    if (!raw) continue
    const url = raw.replace(/\/$/, '')
    if (!isLocalSiteUrl(url)) {
      return url
    }
  }

  return 'https://ukpubs.co.uk'
}
