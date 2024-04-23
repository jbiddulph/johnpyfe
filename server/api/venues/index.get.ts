import venues from "@/data/venues.json";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const skip = query.skip;
  const take = query.take;
    const paginatedVenues = await prisma.venue.findMany({
      skip: parseInt(skip),
      take: parseInt(take),
    });

    return paginatedVenues;
  
});

// export default defineEventHandler(async (event) => {
//   console.log("event context: ", event.context);
  
//   let skip = 0;
//   let take = 10;

//   // Check if skip is provided
//   if (typeof event.context.skip === 'string') {
//     skip = parseInt(event.context.skip, 20);
//   }

//   // Check if take is provided
//   if (typeof event.context.take === 'string') {
//     take = parseInt(event.context.take, 20);
//   }

//   try {
//     const paginatedVenues = await prisma.venue.findMany({
//       skip,
//       take,
//     });

//     return paginatedVenues;
//   } catch (error) {
//     console.error("Error fetching paginated venues:", error);
//     throw error;
//   }
// });


 