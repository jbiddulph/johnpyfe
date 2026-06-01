import { prisma } from '../../utils/prisma'
import {
  paginatedVenueResponse,
  parseVenuePagination,
} from '../../utils/venue-list'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { skip, take } = parseVenuePagination(query)

  // Match historical /venues list: all rows, paginated (no is_live filter).
  const where = {}

  try {
    const [items, total] = await prisma.$transaction([
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
    const message = error instanceof Error ? error.message : 'Failed to fetch venues'
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch venues',
      message,
    })
  }
})
