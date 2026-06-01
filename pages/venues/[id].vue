<script setup>
const route = useRoute()
const id = route.params.id

const { data: venue, error } = await useAsyncData(`venue-redirect-${id}`, () =>
  $fetch(`/api/venues/${id}`),
)

if (error.value || !venue.value) {
  throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
}

await navigateTo(venuePath(venue.value.id, venue.value.slug), { redirectCode: 301 })
</script>
