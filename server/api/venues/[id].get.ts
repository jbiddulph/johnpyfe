import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const { id } = event.context.params;
  const fsa = await prisma.venue.findUnique({
    where: {
      id: parseInt(id)
    },
  })
  if(!fsa) {
    throw createError({
      statusCode: 404,
      message: `Venue with venueID of ${id} does not exist`,
    })
  }

  return fsa;
});