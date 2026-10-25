import { prisma } from '../../../utils/prisma'
import {
  paginatedVenueResponse,
  parseVenuePagination,
  venueListSelect,
} from '../../../utils/venue-list'

export default defineEventHandler(async (event) => {
  // Public hub data; let the CDN absorb repeat map-pin fetches from hub pages (matches their ISR window).
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  const query = getQuery(event)
  const townName = String(query.town || '').trim()
  if (!townName) {
    throw createError({ statusCode: 400, statusMessage: 'town query required' })
  }

  const { skip, take } = parseVenuePagination(query)
  const where = {
    town: { equals: townName, mode: 'insensitive' as const },
    slug: { not: '' },
  }

  const [items, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      select: venueListSelect(query),
      orderBy: { venuename: 'asc' },
      skip,
      take,
    }),
    prisma.venue.count({ where }),
  ])

  return paginatedVenueResponse(items, total, skip, take)
})
