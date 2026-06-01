import { prisma } from '../../../utils/prisma'
import {
  paginatedVenueResponse,
  parseVenuePagination,
  venueHubSelect,
} from '../../../utils/venue-list'

export default defineEventHandler(async (event) => {
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
      select: venueHubSelect,
      orderBy: { venuename: 'asc' },
      skip,
      take,
    }),
    prisma.venue.count({ where }),
  ])

  return paginatedVenueResponse(items, total, skip, take)
})
