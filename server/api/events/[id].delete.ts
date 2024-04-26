import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const { id } = event.context.params;
  const venue = await prisma.event.delete({
    where: {
      id: parseInt(id)
    }
  })
  if(!venue) {
    throw createError({
      statusCode: 404,
      message: `Venue with venueID of ${id} does not exist`,
    })
  }

  return venue;
});