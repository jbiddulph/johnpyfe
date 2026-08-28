import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/require-auth'
import { parseVenueId } from '../../utils/venue-social'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const venueId = parseVenueId(event.context.params?.venueId)
  const method = event.method

  if (method === 'GET') {
    const favorite = await prisma.ukpubsFavorite.findUnique({
      where: { userId_venueId: { userId: user.id, venueId } },
      select: { id: true },
    })
    return { isFavorite: Boolean(favorite) }
  }

  if (method === 'DELETE') {
    await prisma.ukpubsFavorite.deleteMany({
      where: { userId: user.id, venueId },
    })
    return { isFavorite: false }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
