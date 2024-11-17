import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const { id } = event.context.params;
  const venue = await prisma.event.findUnique({
    where: {
      id: parseInt(id)
    },
    include: {
      city: true,
      category: true,
      listing: true,
    },
  })
  if(!venue) {
    throw createError({
      statusCode: 404,
      message: `Venue with venueID of ${id} does not exist`,
    })
  }

  return venue;
});