<script setup>
/** /venues/:id → canonical /venues/:id/:slug (no parent layout — avoids redirect loops). */
const route = useRoute()
const id = Array.isArray(route.params.id) ? route.params.id[0] : String(route.params.id)

const requestFetch = useRequestFetch()
const venue = await requestFetch(`/api/venues/${id}`).catch(() => null)

if (!venue) {
  throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
}

await navigateTo(venuePath(venue.id, venue.slug), { redirectCode: 301 })
</script>
