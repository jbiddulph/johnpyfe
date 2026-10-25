import { prisma } from '../../../utils/prisma'
import { buildCountyVenueWhereWithLive } from '../../../utils/place-hub'
import {
  paginatedVenueResponse,
  parseVenuePagination,
  venueListSelect,
} from '../../../utils/venue-list'

export default defineEventHandler(async (event) => {
  // Public hub data; let the CDN absorb repeat map-pin fetches from hub pages (matches their ISR window).
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
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
      select: venueListSelect(query),
      orderBy: { venuename: 'asc' },
      skip,
      take,
    }),
    prisma.venue.count({ where }),
  ])

  return paginatedVenueResponse(items, total, skip, take)
})
