import { prisma } from '../../../utils/prisma'
import { buildCountyVenueFilter } from '../../../utils/place-hub'
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

  const countyFilter = await buildCountyVenueFilter({ slug, county: countyName })
  const { skip, take } = parseVenuePagination(query)

  const where = {
    is_live: '1',
    county: countyFilter,
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
