// api/events/[town].ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const { town } = event.context.params;

  const city = await prisma.city.findUnique({
    where: { slug: town },
    include: {
      events: {
        include: {
          city: true, // Ensure city information is included
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