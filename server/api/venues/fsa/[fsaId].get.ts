import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');

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
