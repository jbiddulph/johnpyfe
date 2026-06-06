import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import {
  paginatedVenueResponse,
  parseVenuePagination,
} from '../../utils/venue-list'

function buildVenueListWhere(query: Record<string, unknown>): Prisma.VenueWhereInput {
  const where: Prisma.VenueWhereInput = {}
  const town = String(query.town || '').trim()
  const county = String(query.county || '').trim()
  const q = String(query.q || '').trim()

  if (town) {
    where.town = { equals: town, mode: 'insensitive' }
  }
  if (county) {
    where.county = { equals: county, mode: 'insensitive' }
  }
  if (q.length > 0) {
    where.venuename = { contains: q, mode: 'insensitive' }
  }

  return where
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { skip, take } = parseVenuePagination(query)
  const where = buildVenueListWhere(query)

  try {
    const hasListFilters = Boolean(
      String(query.town || '').trim()
      || String(query.county || '').trim()
      || String(query.q || '').trim(),
    )

    if (!hasListFilters) {
      const idRows = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "Venue"
        ORDER BY RANDOM()
        LIMIT ${take}
        OFFSET ${skip}
      `
      const ids = idRows.map((row) => row.id)
      const [items, total] = await prisma.$transaction([
        ids.length
          ? prisma.venue.findMany({ where: { id: { in: ids } } })
          : Promise.resolve([]),
        prisma.venue.count({ where }),
      ])

      const byId = new Map(items.map((item) => [item.id, item]))
      const orderedItems = ids.map((id) => byId.get(id)).filter((item): item is NonNullable<typeof item> => item != null)

      return paginatedVenueResponse(orderedItems, total, skip, take)
    }

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
