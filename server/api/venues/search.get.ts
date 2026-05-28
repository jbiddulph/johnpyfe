import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');

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
