import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const skip = query.skip;
  const take = query.take;
    const paginatedVenues = await prisma.event.findMany({
      skip: parseInt(skip),
      take: parseInt(take),
    });

    return paginatedVenues;
  
});


 