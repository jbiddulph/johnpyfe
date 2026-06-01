<template>
  <div v-if="!venue" class="container mx-auto p-4 py-8 text-lg text-gray-600">
    Loading venue…
  </div>
  <div v-else class="container mx-auto p-4">
    <h1 class="text-4xl font-bold my-8">
      <NuxtLink to="/venues">
        <span class="text-amber-500">Venues</span>
      </NuxtLink>
      - {{ venue.venuename }}, {{ venue.town }}, {{ venue.county }}
    </h1>
    <div class="flex flex-col md:flex-row">
      <img
        :src="venueImageSrc"
        :alt="`${venue.venuename} in ${venue.town}`"
        class="w-full md:w-1/2 h-auto object-cover"
      />
      <div class="md:ml-8 venue-desc">
        <h2 class="text-3xl">Address</h2>
        <p class="text-2xl">{{ venue.address }}</p>
        <h2 class="text-3xl mt-4">City / Region</h2>
        <p class="text-2xl">
          {{ venue.town }} / {{ venueRegion }} / {{ postalsearchDisplay }}
        </p>
        <h2 v-if="venue.telephone && venue.telephone !== 'NULL'" class="text-3xl mt-4">Telephone</h2>
        <p v-if="venue.telephone && venue.telephone !== 'NULL'" class="text-2xl">{{ venue.telephone }}</p>
        <h2 v-if="venueWebsite" class="text-3xl mt-4">Website</h2>
        <p v-if="venueWebsite" class="text-2xl">
          <a :href="venueWebsite" target="_blank" rel="noopener">{{ venueWebsite }}</a>
        </p>
      </div>
    </div>
    <div id="singlemap" style="height: 400px;" />
    <h2 class="text-4xl font-bold my-8">Events</h2>
    <ul v-if="venueEvents.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <li v-for="(event, index) in venueEvents" :key="event.id">
        <event-listing :event="event" :index="index" />
      </li>
    </ul>
    <p v-else class="text-lg text-gray-600">No upcoming events at this venue.</p>
  </div>
</template>

<script setup>
import { useEventStore } from '@/store/event.js'

const route = useRoute()
const config = useRuntimeConfig()
const eventStore = useEventStore()
const requestFetch = useRequestFetch()

const venueId = getRouteParam(route.params.id)
const slugFromRoute = getRouteParam(route.params.slug)

const { data: venue, error: venueError } = await useAsyncData(
  `venue-${venueId}`,
  () => requestFetch(`/api/venues/${venueId}`),
)

if (venueError.value || !venue.value) {
  throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
}

if (
  venue.value.slug
  && slugFromRoute
  && slugFromRoute.toLowerCase() !== String(venue.value.slug).toLowerCase()
) {
  await navigateTo(venuePath(venue.value.id, venue.value.slug), { redirectCode: 301 })
}

const { data: events } = await useAsyncData(
  `venue-events-${venueId}`,
  () => requestFetch(`/api/events/venue/${venueId}`),
  { default: () => [] },
)

const venueEvents = computed(() => events.value ?? [])

const v = venue.value
const canonicalPath = venuePath(v.id, v.slug)
useSiteSeo({
  title: `${v.venuename} — pub & venue in ${v.town}, ${v.county}`,
  description: `Events, listings and details for ${v.venuename} in ${v.town}, ${v.county}. Find gigs, quizzes and live entertainment near you.`,
  path: canonicalPath,
  jsonLd: venueJsonLd(v, `${siteBaseUrl()}${canonicalPath}`),
})

const venueRegion = computed(() => {
  const v = venue.value
  if (!v) return '—'
  const r = v.local_authority || v.county
  return r && r !== 'NULL' ? r : '—'
})

const postalsearchDisplay = computed(() => {
  const p = venue.value?.postalsearch
  return p && p !== 'NULL' ? p : '—'
})

const venueWebsite = computed(() => {
  const w = venue.value?.website
  if (!w || w === 'NULL' || !w.startsWith('http')) return null
  return w
})

const venueImageSrc = computed(() => {
  const v = venue.value
  if (!v?.photo || v.photo === 'images/venues/awaiting.jpg') {
    return '/assets/images/awaiting.jpg'
  }
  const folder = config.public.venueImgFolder || ''
  return `${folder}${v.photo}`
})

onMounted(async () => {
  if (!venue.value) {
    try {
      venue.value = await $fetch(useApiUrl(`/api/venues/${venueId}`))
    } catch {
      /* 404 already handled on server */
    }
  }

  eventStore.events = venueEvents.value

  const v = venue.value
  if (!v?.longitude || !v?.latitude) return

  await nextTick()
  if (!document.getElementById('singlemap')) return

  const mapboxgl = (await import('mapbox-gl')).default
  const token = config.public.mapbox_token
  if (!token) return

  mapboxgl.accessToken = token
  const map = new mapboxgl.Map({
    container: 'singlemap',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [Number(v.longitude), Number(v.latitude)],
    zoom: 14,
  })

  map.on('load', () => {
    new mapboxgl.Marker()
      .setLngLat([Number(v.longitude), Number(v.latitude)])
      .addTo(map)
  })
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
