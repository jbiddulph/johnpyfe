<template>
  <div class="container mx-auto p-4">
    <div v-if="pending" class="py-8 text-lg text-gray-600">Loading venue…</div>
    <div v-else-if="error || !venue" class="py-8 text-lg text-red-600">Venue not found.</div>
    <template v-else>
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
            {{ venue.town }} / {{ venueRegion }} / {{ venue.postalsearch !== 'NULL' ? venue.postalsearch : '—' }}
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
      <ul v-if="events.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(event, index) in events" :key="event.id">
          <event-listing :event="event" :index="index" />
        </li>
      </ul>
      <p v-else class="text-lg text-gray-600">No upcoming events at this venue.</p>
    </template>
  </div>
</template>

<script setup>
import { useEventStore } from '@/store/event.js'

const route = useRoute()
const config = useRuntimeConfig()
const eventStore = useEventStore()

const id = computed(() => {
  const raw = route.params.id
  return Array.isArray(raw) ? raw[0] : String(raw)
})

const slugParam = computed(() => {
  const raw = route.params.slug
  return Array.isArray(raw) ? raw[0] : String(raw)
})

const { data: venue, pending, error } = await useFetch(() => `/api/venues/${id.value}`, {
  key: () => `venue-${id.value}`,
})

if (!pending.value && !venue.value) {
  throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
}

if (
  venue.value?.slug
  && slugParam.value
  && slugParam.value.toLowerCase() !== venue.value.slug.toLowerCase()
) {
  await navigateTo(venuePath(venue.value.id, venue.value.slug), { redirectCode: 301 })
}

if (venue.value) {
  const canonicalPath = venuePath(venue.value.id, venue.value.slug)
  useSiteSeo({
    title: `${venue.value.venuename} — pub & venue in ${venue.value.town}, ${venue.value.county}`,
    description: `Events, listings and details for ${venue.value.venuename} in ${venue.value.town}, ${venue.value.county}. Find gigs, quizzes and live entertainment near you.`,
    path: canonicalPath,
    jsonLd: venueJsonLd(venue.value, `${siteBaseUrl()}${canonicalPath}`),
  })
}

const venueRegion = computed(() => {
  if (!venue.value) return '—'
  const r = venue.value.local_authority || venue.value.county
  return r && r !== 'NULL' ? r : '—'
})

const venueWebsite = computed(() => {
  const w = venue.value?.website
  if (!w || w === 'NULL' || !w.startsWith('http')) return null
  return w
})

const venueImageSrc = computed(() => {
  if (!venue.value?.photo || venue.value.photo === 'images/venues/awaiting.jpg') {
    return '/assets/images/awaiting.jpg'
  }
  const folder = config.public.venueImgFolder || ''
  return `${folder}${venue.value.photo}`
})

const { data: eventsData } = await useFetch(() => `/api/events/venue/${id.value}`, {
  key: () => `venue-events-${id.value}`,
})

const events = computed(() => eventsData.value ?? [])

async function initVenueMap() {
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
}

onMounted(async () => {
  eventStore.events = eventsData.value ?? []
  await initVenueMap()
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
