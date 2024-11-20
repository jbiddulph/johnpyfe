
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      slug: true,
    }
  });

  const venueurls = venues.map(venue => ({
    _path: `/venues/${venue.id}/${venue.slug}`,
    modifiedAt: new Date()
  }));

  return venueurls.map((url) => ({ loc: url._path, lastmod: new Date() }));
});