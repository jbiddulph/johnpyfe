import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const skip = query.skip ? parseInt(query.skip as string) : 0;
  const take = query.take ? parseInt(query.take as string) : 104;
  
  try {
    const paginatedEvents = await prisma.event.findMany({
      skip: skip,
      take: take,
      include: {
        city: true,
        category: true,
        listing: true,
      },
    });

    return paginatedEvents;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch events'
    });
  }
});


 