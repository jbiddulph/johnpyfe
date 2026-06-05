import { prisma } from '../../utils/prisma'
import {
  buildCountyVenueWhereWithLive,
  findCountyBySlug,
  resolveTown,
} from '../../utils/place-hub'

const eventInclude = {
  listing: true,
  category: true,
  city: true,
} as const

/** County hub: towns, venues, and upcoming events in a county. */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'slug required' })
  }

  const county = await findCountyBySlug(slug)
  if (!county) {
    throw createError({ statusCode: 404, statusMessage: 'County not found' })
  }

  const now = new Date()
  const venueWhere = await buildCountyVenueWhereWithLive({ slug, requireSlug: false })

  const townRows = await prisma.venue.groupBy({
    by: ['town'],
    where: venueWhere,
    _count: { _all: true },
    orderBy: { town: 'asc' },
  })

  const towns = await Promise.all(
    townRows
      .filter((row) => Boolean(row.town?.trim()) && row.town.toUpperCase() !== 'NULL')
      .map(async (row) => {
        const resolved = await resolveTown(row.town)
        return {
          name: row.town,
          displayName: resolved?.displayName ?? row.town,
          slug: resolved?.slug ?? '',
          href: resolved?.href ?? null,
          venueCount: row._count._all,
        }
      }),
  )

  const venueTotal = await prisma.venue.count({
    where: await buildCountyVenueWhereWithLive({ slug }),
  })

  const events = await prisma.event.findMany({
    where: {
      event_start: { gt: now },
      listing: await buildCountyVenueWhereWithLive({ slug, requireSlug: false }),
    },
    include: eventInclude,
    orderBy: { event_start: 'asc' },
    take: 100,
  })

  return {
    slug: county.slug,
    countyName: county.name,
    displayName: county.displayName,
    towns: towns.filter((t) => t.href),
    venueTotal,
    events,
  }
})
