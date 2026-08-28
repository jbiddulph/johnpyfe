import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/require-auth'
import { ensureUkpubsProfile } from '../../../utils/crawl-profiles'
import {
  parseVenueId,
  requireVenue,
  parseRating,
  parseComment,
  getVenueReviewsPayload,
} from '../../../utils/venue-social'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await ensureUkpubsProfile(user)

  const venueId = parseVenueId(event.context.params?.id)
  await requireVenue(venueId)

  const body = await readBody(event)
  const rating = parseRating(body?.rating)
  const comment = parseComment(body?.comment)

  await prisma.ukpubsReview.upsert({
    where: { userId_venueId: { userId: user.id, venueId } },
    create: {
      userId: user.id,
      venueId,
      rating,
      comment,
    },
    update: {
      rating,
      comment,
    },
  })

  return getVenueReviewsPayload(venueId, user.id)
})
