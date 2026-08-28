import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/require-auth'
import { parseVenueId, getVenueReviewsPayload } from '../../../utils/venue-social'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const venueId = parseVenueId(event.context.params?.id)

  const existing = await prisma.ukpubsReview.findUnique({
    where: { userId_venueId: { userId: user.id, venueId } },
    select: { id: true },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'You have not reviewed this venue' })
  }

  await prisma.ukpubsReview.delete({ where: { id: existing.id } })
  return getVenueReviewsPayload(venueId, user.id)
})
