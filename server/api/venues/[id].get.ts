import { prisma } from '../../utils/prisma'


export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');

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
