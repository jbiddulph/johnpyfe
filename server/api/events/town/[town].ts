/**
 * @deprecated Prefer GET /api/towns/:slug — kept for existing clients (e.g. event store).
 */
import { prisma } from '../../../utils/prisma'
import { findTownBySlug } from '../../../utils/place-hub'

const eventInclude = {
  listing: true,
  category: true,
  city: true,
} as const

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.town
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'town slug required' })
  }

  const town = await findTownBySlug(slug)
  if (!town) {
    throw createError({ statusCode: 404, statusMessage: 'City not found' })
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

  return {
    cityName: town.displayName,
    events,
  }
})
