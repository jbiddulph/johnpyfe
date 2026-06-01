<script setup>
/** /venues/:id → canonical /venues/:id/:slug (no parent layout — avoids redirect loops). */
const route = useRoute()
const id = Array.isArray(route.params.id) ? route.params.id[0] : String(route.params.id)

const { data: venue, error } = await useFetch(`/api/venues/${id}`, {
  key: `venue-redirect-${id}`,
})

if (error.value || !venue.value) {
  throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
}

await navigateTo(venuePath(venue.value.id, venue.value.slug), { redirectCode: 301 })
</script>
