import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');

  const query = getQuery(event)
  const skip = query.skip ? parseInt(query.skip as string) : 0;
  const take = query.take ? parseInt(query.take as string) : 104;
  
  try {
    const paginatedVenues = await prisma.venue.findMany({
      skip: skip,
      take: take,
    });

    return paginatedVenues;
  } catch (error) {
    console.error('Error fetching venues:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch venues'
    });
  }
});

