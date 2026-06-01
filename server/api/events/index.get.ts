import { prisma } from '../../utils/prisma'
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const skip = query.skip ? parseInt(query.skip as string) : 0;
  const take = query.take ? parseInt(query.take as string) : 104;
  
  try {
    const now = new Date();
    
    const paginatedEvents = await prisma.event.findMany({
      skip: skip,
      take: take,
      where: {
        event_start: {
          gt: now // Only return events that start after now
        }
      },
      include: {
        city: true,
        category: true,
        listing: true,
      },
      orderBy: {
        event_start: 'asc' // Order by event start date, earliest first
      }
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


 