import type { PrismaClient } from '@prisma/client'
import { cleanDbString } from '../../utils/format-venue'

export type TopVenueWithEvents = {
  venueId: number
  venueName: string
  town: string
  slug: string
  count: number
  href: string
}

export type TopTownWithEvents = {
  town: string
  slug: string
  eventCount: number
  href: string
}

export type EventsTopTenStats = {
  limitedVenues: TopVenueWithEvents[]
  limitedTowns: TopTownWithEvents[]
}

/** Top venues and towns ranked by upcoming event count. */
export async function getEventsTopTen(
  prisma: PrismaClient,
  limit = 10,
): Promise<EventsTopTenStats> {
  const now = new Date()

  const [venueGroups, townGroups] = await Promise.all([
    prisma.event.groupBy({
      by: ['listingId'],
      where: { event_start: { gt: now } },
      _count: { _all: true },
      orderBy: { _count: { _all: 'desc' } },
      take: limit,
    }),
    prisma.event.groupBy({
      by: ['cityId'],
      where: { event_start: { gt: now } },
      _count: { _all: true },
      orderBy: { _count: { _all: 'desc' } },
      take: limit,
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
      if (!venue?.slug) return null
      return {
        venueId: venue.id,
        venueName: cleanDbString(venue.venuename) || venue.venuename,
        town: cleanDbString(venue.town) || venue.town,
        slug: venue.slug,
        count: g._count._all,
        href: `/venues/${venue.id}/${venue.slug}`,
      } satisfies TopVenueWithEvents
    })
    .filter((row): row is TopVenueWithEvents => row != null)

  const limitedTowns = townGroups
    .map((g) => {
      const city = cityById.get(g.cityId)
      if (!city?.slug) return null
      return {
        town: city.name,
        slug: city.slug,
        eventCount: g._count._all,
        href: `/town/${city.slug}`,
      } satisfies TopTownWithEvents
    })
    .filter((row): row is TopTownWithEvents => row != null)

  return { limitedVenues, limitedTowns }
}
