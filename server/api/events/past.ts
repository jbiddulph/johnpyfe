import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const skip = parseInt(query.skip as string) || 0;
  const take = parseInt(query.take as string) || 20;
  const cityId = query.cityId ? parseInt(query.cityId as string) : undefined;
  const venueId = query.venueId ? parseInt(query.venueId as string) : undefined;
  
  const now = new Date();
  
  const whereClause: any = {
    event_start: {
      lt: now // Only return events that started before now
    }
  };
  
  // Add city filter if provided
  if (cityId) {
    whereClause.cityId = cityId;
  }
  
  // Add venue filter if provided
  if (venueId) {
    whereClause.listingId = venueId;
  }
  
  const events = await prisma.event.findMany({
    where: whereClause,
    include: {
      category: true,
      listing: true,
      city: true
    },
    orderBy: {
      event_start: 'desc' // Order by event start date, most recent first
    },
    skip,
    take
  });
  
  return events;
});
