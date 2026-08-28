import { parseVenueId, getVenueReviewsPayload } from '../../../utils/venue-social'
import { tryAuth } from '../../../utils/require-auth'

export default defineEventHandler(async (event) => {
  const venueId = parseVenueId(event.context.params?.id)
  const user = await tryAuth(event)
  return getVenueReviewsPayload(venueId, user?.id)
})
