import { prisma } from './prisma'

const STATIC_ROUTES = ['/', '/events', '/venues', '/map'] as const

/** DB stores literal "NULL" strings — Invalid Date breaks sitemap XML generation. */
function safeLastmod(value: unknown, fallback: Date): Date {
  if (value == null || value === 'NULL' || value === '') return fallback
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export async function getSitemapUrls() {
  const now = new Date()

  try {
    return await buildSitemapUrls(now)
  } catch (error) {
    console.error('[sitemap] Failed to load URLs from database:', error)
    return STATIC_ROUTES.map((loc) => ({
      loc,
      lastmod: now,
      changefreq: 'daily' as const,
      priority: loc === '/' ? 1 : 0.8,
    }))
  }
}

async function buildSitemapUrls(now: Date) {
  const staticUrls = STATIC_ROUTES.map((loc) => ({
    loc,
    lastmod: now,
    changefreq: 'daily' as const,
    priority: loc === '/' ? 1 : 0.8,
  }))

  const venues = await prisma.venue.findMany({
    where: { is_live: '1', slug: { not: '' } },
    select: { id: true, slug: true, updated_at: true },
    take: 40000,
  })

  const venueUrls = venues.map((venue) => ({
    loc: `/venues/${venue.id}/${venue.slug}`,
    lastmod: safeLastmod(venue.updated_at, now),
    changefreq: 'weekly' as const,
    priority: 0.7,
  }))

  const cities = await prisma.city.findMany({
    select: { slug: true },
  })

  const townUrls = cities.map((city) => ({
    loc: `/town/${city.slug}`,
    lastmod: now,
    changefreq: 'daily' as const,
    priority: 0.75,
  }))

  const events = await prisma.event.findMany({
    where: { event_start: { gt: now } },
    select: { id: true, created_at: true },
    orderBy: { event_start: 'asc' },
    take: 10000,
  })

  const eventUrls = events.map((event) => ({
    loc: `/events/${event.id}`,
    lastmod: safeLastmod(event.created_at, now),
    changefreq: 'daily' as const,
    priority: 0.65,
  }))

  return [...staticUrls, ...townUrls, ...eventUrls, ...venueUrls]
}
