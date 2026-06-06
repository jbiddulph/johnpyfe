import { prisma } from '../../utils/prisma'
import {
  findTownBySlug,
  getDominantCountyForTown,
  resolveCounty,
} from '../../utils/place-hub'

const eventInclude = {
  listing: true,
  category: true,
  city: true,
} as const

/** Town hub: events + metadata from City row or venue town name. */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'slug required' })
  }

  const town = await findTownBySlug(slug)
  if (!town) {
    throw createError({ statusCode: 404, statusMessage: 'Town not found' })
  }

  const now = new Date()
  let events

  if (town.source === 'city') {
    const city = await prisma.city.findUnique({
      where: { slug: town.slug },
      include: {
        events: {
          where: { event_start: { gt: now } },
          include: eventInclude,
          orderBy: [{ event_start: 'asc' }, { id: 'asc' }],
          take: 100,
        },
      },
    })
    events = city?.events ?? []
  } else {
    events = await prisma.event.findMany({
      where: {
        event_start: { gt: now },
        listing: {
          is_live: '1',
          town: { equals: town.name, mode: 'insensitive' },
        },
      },
      include: eventInclude,
      orderBy: [{ event_start: 'asc' }, { id: 'asc' }],
      take: 100,
    })
  }

  const countyRow = await getDominantCountyForTown(town.name)
  const county = countyRow
    ? await resolveCounty(countyRow.name)
    : null

  return {
    slug: town.slug,
    cityName: town.displayName,
    townName: town.name,
    source: town.source,
    county: county
      ? {
          name: countyRow!.name,
          displayName: county.displayName,
          slug: county.slug,
          href: county.href,
        }
      : null,
    events,
  }
})
