import { prisma } from '../../../utils/prisma'
import { buildCountyVenueWhereWithLive } from '../../../utils/place-hub'
import {
  paginatedVenueResponse,
  parseVenuePagination,
  venueHubSelect,
} from '../../../utils/venue-list'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = String(query.slug || '').trim()
  const countyName = String(query.county || '').trim()

  if (!slug && !countyName) {
    throw createError({ statusCode: 400, statusMessage: 'slug or county query required' })
  }

  const { skip, take } = parseVenuePagination(query)
  const where = await buildCountyVenueWhereWithLive({ slug, county: countyName })

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
