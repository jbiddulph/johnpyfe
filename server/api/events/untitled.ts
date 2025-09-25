import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  // Get events with "Untitled" in the title, ordered by most recent first
  const untitledEvents = await prisma.event.findMany({
    where: {
      event_title: {
        contains: 'Untitled',
        mode: 'insensitive'
      }
    },
    include: {
      category: true,
      listing: true,
      city: true
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 20 // Limit to 20 most recent untitled events
  });
  
  return untitledEvents;
});
