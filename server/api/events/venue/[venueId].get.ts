import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const { venueId } = event.context.params;
  const events = await prisma.event.findMany({
    where: {
      venue_id: parseInt(venueId)
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