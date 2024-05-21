import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const { town } = getQuery(event);

  // Construct filters with case-insensitive town comparison
  const filters = {
    town: {
      equals: town,
      mode: 'insensitive'
    },
  };

  // Return distinct venue names with their counts, ordered by count descending
  const venues = await prisma.venue.groupBy({
    by: ['venuename'],
    _count: {
      venuename: true
    },
    where: filters,
    orderBy: {
      _count: {
        venuename: 'desc'
      }
    },
    take: 500,
  });

  return venues;
});
