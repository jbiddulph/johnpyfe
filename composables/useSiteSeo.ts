type SiteSeoOptions = {
  title: string
  description: string
  path?: string
  image?: string
  type?: 'website' | 'article'
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export function siteBaseUrl() {
  const config = useRuntimeConfig()
  return String(config.public.appURL || 'https://ukpubs.co.uk').replace(/\/$/, '')
}

export function venuePath(id: number | string, slug: string) {
  return `/venues/${id}/${slug}`
}

export function townPath(slug: string) {
  return `/town/${slug}`
}

export function useSiteSeo(options: SiteSeoOptions) {
  const route = useRoute()
  const siteUrl = siteBaseUrl()
  const path = options.path ?? route.path
  const canonical = `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
  const image = options.image?.startsWith('http')
    ? options.image
    : `${siteUrl}${options.image ?? '/favicon-192x192.png'}`

  useSeoMeta({
    title: options.title,
    description: options.description,
    ogTitle: options.title,
    ogDescription: options.description,
    ogUrl: canonical,
    ogImage: image,
    ogType: options.type ?? 'website',
    ogLocale: 'en_GB',
    twitterCard: 'summary_large_image',
    twitterTitle: options.title,
    twitterDescription: options.description,
    twitterImage: image,
  })

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
    ...(options.jsonLd
      ? {
          script: [
            {
              type: 'application/ld+json',
              innerHTML: JSON.stringify(
                Array.isArray(options.jsonLd) ? options.jsonLd : options.jsonLd,
              ),
            },
          ],
        }
      : {}),
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
    telephone?: string
    website?: string
    latitude?: string
    longitude?: string
  },
  canonical: string,
) {
  const lat = venue.latitude ? Number.parseFloat(venue.latitude) : undefined
  const lng = venue.longitude ? Number.parseFloat(venue.longitude) : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'BarOrPub',
    name: venue.venuename,
    url: canonical,
    ...(venue.website ? { sameAs: venue.website } : {}),
    ...(venue.telephone ? { telephone: venue.telephone } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: venue.address,
      addressLocality: venue.town,
      addressRegion: venue.county || venue.postalsearch,
      postalCode: venue.postcode,
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
