import { prisma } from '../../utils/prisma'

/** Quick check that DATABASE_URL works in this environment. */
export default defineEventHandler(async () => {
  try {
    const venueCount = await prisma.venue.count()
    const upcomingEventCount = await prisma.event.count({
      where: { event_start: { gt: new Date() } },
    })
    const cityCount = await prisma.city.count()

    return {
      ok: true,
      venueCount,
      liveVenueCount: await prisma.venue.count({ where: { is_live: '1' } }),
      upcomingEventCount,
      cityCount,
      databaseUrlHint:
        'Use Supabase transaction pooler port 6543 with ?pgbouncer=true&connection_limit=1',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database unreachable'
    throw createError({
      statusCode: 503,
      statusMessage: 'Database unavailable',
      data: {
        ok: false,
        message,
        fix:
          'Set DATABASE_URL in Netlify to the Supabase Transaction pooler (port 6543), e.g. postgresql://...@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1',
      },
    })
  }
})
