import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const { venueId } = event.context.params;
  const now = new Date();
  
  const events = await prisma.event.findMany({
    where: {
      listingId: parseInt(venueId),
      event_start: {
        gt: now // Only return events that start after now
      }
    },
    orderBy: {
      event_start: 'asc' // Order by event start date, earliest first
    }
  })
  
  if(!events) {
    throw createError({
      statusCode: 404,
      message: `Venue with venueID of ${venueId} does not exist`,
    })
  }

  return events;
});