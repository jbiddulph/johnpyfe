import venues from "@/data/venues.json";
export default defineEventHandler((event) => {
  const {town} = event.context.params;

  let filteredVenues = venues;

  filteredVenues = filteredVenues.filter(venue => {
    return venue.town.toLowerCase() === town.toLowerCase()
  });

  return filteredVenues;
})