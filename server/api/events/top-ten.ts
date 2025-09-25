import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const now = new Date();
  
  const paginatedVenues = await prisma.event.findMany({
    where: {
      event_start: {
        gt: now // Only return events that start after now
      }
    },
    include: {
      city: true,
      category: true,
      listing: true,
    },
    orderBy: {
      event_start: 'asc' // Order by event start date, earliest first
    }
  });

  // Grouping events by venue and town
  const groupedByVenue = paginatedVenues.reduce((acc, event) => {
    const venueName = event.listing.venuename;
    const venueId = event.listing.id;
    const town = event.city.name;
    const slug = event.listing.slug;

    // Group by venue
    if (acc.venues[venueName]) {
      acc.venues[venueName].count += 1;
    } else {
      acc.venues[venueName] = {
        venueName,
        venueId,
        town,
        slug,
        count: 1,
      };
    }

    // Group by town
    if (acc.towns[town]) {
      acc.towns[town].eventCount += 1;
    } else {
      acc.towns[town] = {
        town,
        eventCount: 1,
      };
    }

    return acc;
  }, { venues: {}, towns: {} });

  // Convert grouped data into arrays for both venue and town information
  const venuesWithEventCounts = Object.values(groupedByVenue.venues);
  const townsWithEventCounts = Object.values(groupedByVenue.towns);

  // Sort by count in ascending order
  const sortedVenues = venuesWithEventCounts.sort((a, b) => a.count - b.count);
  const sortedTowns = townsWithEventCounts.sort((a, b) => a.eventCount - b.eventCount);

  // Limit to the first 10 entries
  const limitedVenues = sortedVenues.slice(0, 10);
  const limitedTowns = sortedTowns.slice(0, 10);

  return { limitedVenues, limitedTowns };
});
