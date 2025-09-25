// api/events/[town].ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const { town } = event.context.params;

  const now = new Date();
  
  const city = await prisma.city.findUnique({
    where: { slug: town },
    include: {
      events: {
        where: {
          event_start: {
            gt: now // Only return events that start after now
          }
        },
        include: {
          city: true, // Ensure city information is included
          category: true,
          listing: true,
        },
        orderBy: {
          event_start: 'asc' // Order by event start date, earliest first
        },
      },
    },
  });

  if (!city) {
    throw createError({ statusCode: 404, statusMessage: 'City not found' });
  }

  return {
    cityName: city.name,
    events: city.events,
  };
});