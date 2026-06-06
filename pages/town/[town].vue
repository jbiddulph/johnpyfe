<template>
  <div>
    <div v-if="!headerImageMissing" class="relative">
      <img
        :src="headerImageSrc"
        :alt="`Events in ${townName}`"
        :title="townName"
        class="w-full h-auto object-cover min-h-[200px] max-h-[280px]"
        @error="headerImageMissing = true"
      />
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h1 class="text-6xl md:text-8xl font-light text-white drop-shadow-md px-4 text-center">
          {{ townName }}
        </h1>
      </div>
    </div>
    <div class="relative">
      <PlaceHeaderMap :place-name="townName" :venues="mapVenues" />
      <div
        v-if="headerImageMissing"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <h1 class="text-6xl md:text-8xl font-light text-white drop-shadow-md px-4 text-center">
          {{ townName }}
        </h1>
      </div>
    </div>
    <div class="container mx-auto p-4 my-8">
      <Breadcrumbs :items="breadcrumbItems" />

      <section class="my-10">
        <h2 class="text-3xl font-bold mb-4">Pubs and venues in {{ townName }}</h2>
        <p v-if="venueTotal > 0" class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ venueTotal }} {{ venueTotal === 1 ? 'venue' : 'venues' }}
          <span v-if="venueTotalPages > 1"> — page {{ venuePage }} of {{ venueTotalPages }}</span>
        </p>

        <div v-if="venueTotalPages > 1" class="flex justify-center mb-4">
          <UButton label="Previous" :disabled="venuePage <= 1 || venuesLoading" @click="prevVenuePage" />
          <UButton :label="String(venuePage)" class="mx-4" variant="soft" />
          <UButton label="Next" :disabled="venuePage >= venueTotalPages || venuesLoading" @click="nextVenuePage" />
        </div>

        <p v-if="venuesLoading && !venueList.length" class="text-lg text-gray-600">Loading venues…</p>
        <p v-else-if="!venueList.length" class="text-lg text-gray-600">No venue listings for this town yet.</p>
        <ul v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <li v-for="venue in venueList" :key="venue.id">
            <VenueHubCard :venue="venue" />
          </li>
        </ul>

        <div v-if="venueTotalPages > 1" class="flex justify-center mt-6">
          <UButton label="Previous" :disabled="venuePage <= 1 || venuesLoading" @click="prevVenuePage" />
          <UButton :label="String(venuePage)" class="mx-4" variant="soft" />
          <UButton label="Next" :disabled="venuePage >= venueTotalPages || venuesLoading" @click="nextVenuePage" />
        </div>
      </section>

      <h2 class="text-4xl font-bold my-8">Events in {{ townName }}</h2>
      <ul v-if="townEvents.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(event, index) in townEvents" :key="event.id">
          <event-listing :event="event" :index="index" />
        </li>
      </ul>
      <p v-else class="text-lg text-gray-600">No upcoming events in this town.</p>
    </div>
  </div>
</template>

<script setup>
import { useEventStore } from '@/store/event.js'

const VENUE_PAGE_SIZE = 104

const route = useRoute()
const requestFetch = useRequestFetch()
const townSlug = String(route.params.town)
const headerImageMissing = ref(false)
const headerImageSrc = computed(() => `/assets/images/headers/${townSlug}.jpg`)

const { data: townData, error } = await useAsyncData(`town-${townSlug}`, () =>
  requestFetch(`/api/towns/${townSlug}`),
)

if (error.value || !townData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Town not found' })
}

const resolvedTownName = townData.value.townName ?? townData.value.cityName
const townName = computed(() => townData.value?.cityName ?? String(townSlug))
const townEvents = computed(() => townData.value?.events ?? [])
const countyHub = computed(() => townData.value?.county ?? null)
const canonicalPath = townPath(townSlug)

const { data: townVenuesData } = await useAsyncData(
  `town-venues-${townSlug}`,
  () =>
    requestFetch(
      `/api/venues/town?town=${encodeURIComponent(resolvedTownName)}&skip=0&take=${VENUE_PAGE_SIZE}`,
    ),
  { default: () => ({ items: [], total: 0, totalPages: 1 }) },
)

const { data: mapVenuesData } = await useAsyncData(
  `town-map-venues-${townSlug}`,
  () =>
    requestFetch(
      `/api/venues/town?town=${encodeURIComponent(resolvedTownName)}&skip=0&take=500&all=1`,
    ),
  { default: () => ({ items: [] }) },
)

const venueList = ref(townVenuesData.value?.items ?? [])
const venuePage = ref(1)
const venueTotal = ref(townVenuesData.value?.total ?? 0)
const venueTotalPages = ref(townVenuesData.value?.totalPages ?? 1)
const venuesLoading = ref(false)
const mapVenues = computed(() => mapVenuesData.value?.items ?? [])

const countyBreadcrumb = computed(() => {
  if (countyHub.value?.href) {
    return {
      label: countyHub.value.displayName,
      to: countyHub.value.href,
    }
  }
  return null
})

const breadcrumbItems = computed(() => {
  const items = [
    { label: 'Home', to: '/' },
    { label: 'Counties', to: '/counties' },
  ]
  if (countyBreadcrumb.value) {
    items.push(countyBreadcrumb.value)
  }
  items.push({ label: townName.value })
  return items
})

async function fetchVenuePage(page = venuePage.value) {
  venuesLoading.value = true
  try {
    const skip = (page - 1) * VENUE_PAGE_SIZE
    const data = await requestFetch(
      `/api/venues/town?town=${encodeURIComponent(resolvedTownName)}&skip=${skip}&take=${VENUE_PAGE_SIZE}`,
    )
    venueList.value = data.items ?? []
    venueTotal.value = data.total ?? 0
    venueTotalPages.value = data.totalPages ?? 1
    venuePage.value = page
  } catch {
    venueList.value = []
    venueTotal.value = 0
    venueTotalPages.value = 1
  } finally {
    venuesLoading.value = false
  }
}

function prevVenuePage() {
  if (venuePage.value > 1) {
    fetchVenuePage(venuePage.value - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function nextVenuePage() {
  if (venuePage.value < venueTotalPages.value) {
    fetchVenuePage(venuePage.value + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const siteUrl = siteBaseUrl()
useSiteSeo({
  title: `Pubs & events in ${townName.value}`,
  description: `Upcoming gigs, live music, comedy and pub events in ${townName.value}. Browse venues and what's on near you.`,
  path: canonicalPath,
  jsonLd: breadcrumbJsonLd(breadcrumbItems.value, siteUrl),
})

onMounted(() => {
  const eventStore = useEventStore()
  eventStore.selectedTown = townName.value
  eventStore.townEvents = townEvents.value
})
</script>
