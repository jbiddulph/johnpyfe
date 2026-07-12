import { cleanDbString, isValidWebsite } from '../utils/format-venue'
import { siteSeoTitle } from '../utils/site-seo-copy'
import { canonicalSiteUrl } from '../utils/site-url'

type SiteSeoOptions = {
  title: string
  description: string
  keywords?: string
  path?: string
  image?: string
  type?: 'website' | 'article'
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

type SiteSeoInput = SiteSeoOptions | (() => SiteSeoOptions)

export function siteBaseUrl() {
  const config = useRuntimeConfig()
  return canonicalSiteUrl(String(config.public.appURL || ''))
}

export function venuePath(id: number | string, slug: string) {
  const safeSlug = encodeURIComponent(String(slug ?? ''))
  return `/venues/${id}/${safeSlug}`
}

export function townPath(slug: string) {
  return `/town/${encodeURIComponent(String(slug ?? ''))}`
}

export function countyPath(slug: string) {
  return `/county/${encodeURIComponent(String(slug ?? ''))}`
}

export function breadcrumbJsonLd(
  items: Array<{ label: string; to?: string }>,
  baseUrl: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.to ? { item: `${baseUrl}${item.to}` } : {}),
    })),
  }
}

export function useSiteSeo(input: SiteSeoInput) {
  const route = useRoute()
  const siteUrl = siteBaseUrl()

  const options = computed(() => (typeof input === 'function' ? input() : input))

  const path = computed(() => options.value.path ?? route.path)
  const canonical = computed(() => {
    const p = path.value
    return `${siteUrl}${p.startsWith('/') ? p : `/${p}`}`
  })
  const image = computed(() => {
    const img = options.value.image
    return img?.startsWith('http') ? img : `${siteUrl}${img ?? '/ukpubs-logo.png'}`
  })
  const brandedTitle = computed(() => siteSeoTitle(options.value.title))

  useSeoMeta({
    title: computed(() => options.value.title),
    description: computed(() => options.value.description),
    ogTitle: brandedTitle,
    ogDescription: computed(() => options.value.description),
    ogUrl: canonical,
    ogImage: image,
    ogType: computed(() => options.value.type ?? 'website'),
    ogLocale: 'en_GB',
    twitterCard: 'summary_large_image',
    twitterTitle: brandedTitle,
    twitterDescription: computed(() => options.value.description),
    twitterImage: image,
  })

  useHead({
    link: computed(() => [{ rel: 'canonical', href: canonical.value }]),
    meta: computed(() => {
      const keywords = options.value.keywords
      return keywords ? [{ name: 'keywords', content: keywords }] : []
    }),
    script: computed(() => {
      const jsonLd = options.value.jsonLd
      if (!jsonLd) return []
      return [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd),
        },
      ]
    }),
  })
}

export function venueJsonLd(
  venue: {
    venuename: string
    address?: string
    town?: string
    county?: string
    postcode?: string
    postalsearch?: string
    website?: string
    latitude?: string
    longitude?: string
  },
  canonical: string,
) {
  const lat = venue.latitude ? Number.parseFloat(venue.latitude) : undefined
  const lng = venue.longitude ? Number.parseFloat(venue.longitude) : undefined
  const website = isValidWebsite(venue.website) ? cleanDbString(venue.website) : null

  return {
    '@context': 'https://schema.org',
    '@type': 'BarOrPub',
    name: venue.venuename,
    url: canonical,
    ...(website ? { sameAs: website } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: cleanDbString(venue.address) ?? undefined,
      addressLocality: cleanDbString(venue.town) ?? undefined,
      addressRegion: cleanDbString(venue.county) || cleanDbString(venue.postalsearch) || undefined,
      postalCode: cleanDbString(venue.postcode) ?? undefined,
      addressCountry: 'GB',
    },
    ...(!Number.isNaN(lat) && !Number.isNaN(lng)
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: lat,
            longitude: lng,
          },
        }
      : {}),
  }
}

export function eventJsonLd(
  event: {
    event_title: string
    description?: string
    event_start: string | Date
    cost?: string
    website?: string
    listing?: { venuename?: string; town?: string }
    city?: { name?: string }
  },
  canonical: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.event_title,
    description: event.description,
    startDate: new Date(event.event_start).toISOString(),
    url: canonical,
    ...(event.website ? { sameAs: event.website } : {}),
    ...(event.cost ? { offers: { '@type': 'Offer', price: event.cost, priceCurrency: 'GBP' } } : {}),
    location: {
      '@type': 'Place',
      name: event.listing?.venuename,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.listing?.town || event.city?.name,
        addressCountry: 'GB',
      },
    },
  }
}
