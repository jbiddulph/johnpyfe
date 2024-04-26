import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = query.q;

  // Find venues matching the query, ordered by their closeness
  const results = await prisma.venue.findMany({
    where: {
      venuename: {
        contains: q, // Assuming you want to search for venues whose name contains the query
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      venuename: true,
      town: true
    },
    take: 100
  });

  return results;
});

 