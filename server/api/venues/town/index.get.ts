import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');

  const { town } = getQuery(event);

  // Construct filters with case-insensitive town comparison
  const filters = {
    town: {
      equals: town,
      mode: 'insensitive'
    },
  };

  // return filtered venues
  return prisma.venue.findMany({
    where: filters,
  });
});
