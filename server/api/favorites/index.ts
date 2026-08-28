import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/require-auth'
import { ensureUkpubsProfile } from '../../utils/crawl-profiles'
import {
  favoriteVenueSelect,
  parseVenueId,
  requireVenue,
} from '../../utils/venue-social'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await ensureUkpubsProfile(user)
  const method = event.method

  if (method === 'GET') {
    const favorites = await prisma.ukpubsFavorite.findMany({
      where: { userId: user.id },
      include: { venue: { select: favoriteVenueSelect } },
      orderBy: { createdAt: 'desc' },
    })

    return {
      items: favorites.map((row) => ({
        id: row.id,
        venueId: row.venueId,
        createdAt: row.createdAt.toISOString(),
        venue: row.venue,
      })),
    }
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const venueId = parseVenueId(body?.venueId)
    await requireVenue(venueId)

    const favorite = await prisma.ukpubsFavorite.upsert({
      where: { userId_venueId: { userId: user.id, venueId } },
      create: { userId: user.id, venueId },
      update: {},
      include: { venue: { select: favoriteVenueSelect } },
    })

    return {
      id: favorite.id,
      venueId: favorite.venueId,
      createdAt: favorite.createdAt.toISOString(),
      venue: favorite.venue,
      isFavorite: true,
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
