import { prisma } from '../../utils/prisma'

/** Quick check that DATABASE_URL works in this environment. */
export default defineEventHandler(async () => {
  const [venueCount, eventCount, cityCount] = await Promise.all([
    prisma.venue.count({ where: { is_live: '1' } }),
    prisma.event.count({ where: { event_start: { gt: new Date() } } }),
    prisma.city.count(),
  ])

  return {
    ok: true,
    venueCount,
    upcomingEventCount: eventCount,
    cityCount,
  }
})
