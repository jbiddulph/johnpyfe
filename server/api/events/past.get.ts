import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const skip = query.skip ? parseInt(query.skip as string) : 0;
  const take = query.take ? parseInt(query.take as string) : 104;
  
  try {
    const now = new Date();
    
    const pastEvents = await prisma.event.findMany({
      skip: skip,
      take: take,
      where: {
        event_start: {
          lt: now // Only return events that started before now (past events)
        }
      },
      include: {
        city: true,
        category: true,
        listing: true,
      },
      orderBy: {
        event_start: 'desc' // Order by event start date, most recent first
      }
    });

    return pastEvents;
  } catch (error) {
    console.error('Error fetching past events:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch past events'
    });
  }
});

