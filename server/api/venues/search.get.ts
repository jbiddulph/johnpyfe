import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')

  const query = getQuery(event)
  const q = String(query.q || '').trim()
  const limitRaw = Number.parseInt(String(query.limit || '20'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20

  if (q.length < 2) {
    return []
  }

  const results = await prisma.venue.findMany({
    where: {
      OR: [
        { venuename: { contains: q, mode: 'insensitive' } },
        { town: { contains: q, mode: 'insensitive' } },
        { county: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      venuename: true,
      town: true,
      county: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { venuename: 'asc' },
    take: limit,
  })

  return results.map((venue) => ({
    id: venue.id,
    venuename: venue.venuename,
    town: venue.town,
    county: venue.county,
    latitude: venue.latitude,
    longitude: venue.longitude,
  }))
})
