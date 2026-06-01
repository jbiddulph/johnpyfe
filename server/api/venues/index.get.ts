import { prisma } from '../../utils/prisma'
import {
  paginatedVenueResponse,
  parseVenuePagination,
} from '../../utils/venue-list'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { skip, take } = parseVenuePagination(query)

  const where = {
    is_live: '1',
    slug: { not: '' },
  }

  try {
    const [items, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        orderBy: { venuename: 'asc' },
        skip,
        take,
      }),
      prisma.venue.count({ where }),
    ])

    return paginatedVenueResponse(items, total, skip, take)
  } catch (error) {
    console.error('[api/venues] list failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch venues',
    })
  }
})
