<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold my-8">
      <NuxtLink to="/venues">
        <span class="text-amber-500">Venues</span>
      </NuxtLink>
      - {{ venue.venuename }}, {{ venue.town }}, {{ venue.county }}
    </h1>
    <div class="flex flex-col md:flex-row">
      <img
        v-if="venue.photo === 'images/venues/awaiting.jpg'"
        :src="`/assets/images/awaiting.jpg`"
        :alt="`${venue.venuename} in ${venue.town}`"
        class="w-full md:w-1/2 h-auto object-cover"
      />
      <img
        v-else
        :src="`${config.public.venueImgFolder}${venue.photo}`"
        :alt="`${venue.venuename} in ${venue.town}`"
        class="w-full md:w-1/2 h-auto object-cover"
      />
      <div class="md:ml-8 venue-desc">
        <h2 class="text-3xl">Address</h2>
        <p class="text-2xl">{{ venue?.address }}</p>
        <h2 class="text-3xl mt-4">City / Region</h2>
        <p class="text-2xl">{{ venue?.town }} / {{ venue?.region }} / {{ venue?.postalsearch }}</p>
        <h2 class="text-3xl mt-4">Website</h2>
        <p class="text-2xl">
          <a v-if="venue?.website" :href="venue.website" target="_blank" rel="noopener">{{ venue.website }}</a>
        </p>
      </div>
    </div>
    <div id="singlemap" style="height: 400px;" />
    <h2 class="text-4xl font-bold my-8">Events</h2>
    <ul v-if="events.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <li v-for="(event, index) in events" :key="event.id">
        <event-listing :event="event" :index="index" />
      </li>
    </ul>
    <p v-else class="text-lg text-gray-600">No upcoming events at this venue.</p>
  </div>
</template>

<script setup>
import mapboxgl from 'mapbox-gl'
import { useEventStore } from '@/store/event.js'

const route = useRoute()
const config = useRuntimeConfig()
const eventStore = useEventStore()
const id = route.params.id
const slugParam = route.params.slug

const { data: venue, error } = await useAsyncData(`venue-${id}`, () =>
  $fetch(`/api/venues/${id}`),
)

if (error.value || !venue.value) {
  throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
}

if (venue.value.slug && slugParam !== venue.value.slug) {
  await navigateTo(venuePath(venue.value.id, venue.value.slug), { redirectCode: 301 })
}

const canonicalPath = venuePath(venue.value.id, venue.value.slug)
const seoTitle = `${venue.value.venuename} — pub & venue in ${venue.value.town}, ${venue.value.county}`
const seoDescription =
  `Events, listings and details for ${venue.value.venuename} in ${venue.value.town}, ${venue.value.county}. Find gigs, quizzes and live entertainment near you.`

useSiteSeo({
  title: seoTitle,
  description: seoDescription,
  path: canonicalPath,
  jsonLd: venueJsonLd(venue.value, `${siteBaseUrl()}${canonicalPath}`),
})

const { data: eventsData } = await useAsyncData(`venue-events-${id}`, () =>
  $fetch(`/api/events/venue/${id}`),
)
const events = computed(() => eventsData.value ?? [])

const map = ref(null)
const marker = ref(null)

onMounted(() => {
  if (!venue.value?.longitude || !venue.value?.latitude) return

  mapboxgl.accessToken = config.public.mapbox_token
  map.value = new mapboxgl.Map({
    container: 'singlemap',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [Number(venue.value.longitude), Number(venue.value.latitude)],
    zoom: 14,
  })

  map.value.on('load', () => {
    marker.value = new mapboxgl.Marker()
      .setLngLat([Number(venue.value.longitude), Number(venue.value.latitude)])
      .addTo(map.value)
  })

  eventStore.events = eventsData.value ?? []
})
</script>

<style scoped>
.venue-desc p {
  font-weight: 100;
}
#singlemap {
  width: 100%;
  height: 400px !important;
}
</style>
