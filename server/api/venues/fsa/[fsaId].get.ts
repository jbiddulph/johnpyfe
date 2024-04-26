import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const { fsaId } = event.context.params;
  const fsa = await prisma.venue.findMany({
    where: {
      fsa_id: parseInt(fsaId)
    }
  })
  if(!fsa) {
    throw createError({
      statusCode: 404,
      message: `Venue with venueID of ${fsaId} does not exist`,
    })
  }

  return fsa;
});