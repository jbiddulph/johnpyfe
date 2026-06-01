import { prisma } from '../../utils/prisma'

/** Top venues and towns by upcoming event count (bounded queries for serverless). */
export default defineEventHandler(async () => {
  const now = new Date()

  try {
    const [venueGroups, townGroups] = await Promise.all([
      prisma.event.groupBy({
        by: ['listingId'],
        where: { event_start: { gt: now } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 10,
      }),
      prisma.event.groupBy({
        by: ['cityId'],
        where: { event_start: { gt: now } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 10,
      }),
    ])

    const venueIds = venueGroups.map((g) => g.listingId)
    const cityIds = townGroups.map((g) => g.cityId)

    const [venues, cities] = await Promise.all([
      venueIds.length
        ? prisma.venue.findMany({
            where: { id: { in: venueIds } },
            select: { id: true, venuename: true, slug: true, town: true },
          })
        : [],
      cityIds.length
        ? prisma.city.findMany({
            where: { id: { in: cityIds } },
            select: { id: true, name: true, slug: true },
          })
        : [],
    ])

    const venueById = new Map(venues.map((v) => [v.id, v]))
    const cityById = new Map(cities.map((c) => [c.id, c]))

    const limitedVenues = venueGroups
      .map((g) => {
        const venue = venueById.get(g.listingId)
        if (!venue) return null
        return {
          venueName: venue.venuename,
          venueId: venue.id,
          town: venue.town,
          slug: venue.slug,
          count: g._count._all,
        }
      })
      .filter(Boolean)

    const limitedTowns = townGroups
      .map((g) => {
        const city = cityById.get(g.cityId)
        if (!city) return null
        return {
          town: city.name,
          eventCount: g._count._all,
        }
      })
      .filter(Boolean)

    return { limitedVenues, limitedTowns }
  } catch (error) {
    console.error('[api/events/top-ten] failed:', error)
    return { limitedVenues: [], limitedTowns: [] }
  }
})
