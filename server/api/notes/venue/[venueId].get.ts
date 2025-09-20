import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const { venueId } = event.context.params;
  const notes = await prisma.note.findMany({
    where: {
      listingId: parseInt(venueId)
    }
  })
  if(!notes) {
    throw createError({
      statusCode: 404,
      message: `Venue with venueID of ${venueId} does not exist`,
    })
  }

  return notes;
});