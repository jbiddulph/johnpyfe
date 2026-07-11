import { prisma } from '../../../utils/prisma'
import { UPCOMING_EVENT_INCLUDE, UPCOMING_EVENT_ORDER, upcomingEventWhere } from '../../../utils/event-list'

export default defineEventHandler(async (event) => {
  const { venueId } = event.context.params

  const events = await prisma.event.findMany({
    where: {
      listingId: parseInt(venueId),
      ...upcomingEventWhere(),
    },
    include: UPCOMING_EVENT_INCLUDE,
    orderBy: UPCOMING_EVENT_ORDER,
  })

  return events
})