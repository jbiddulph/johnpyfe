<template>
  <div>
    <PlaceHeaderMap :place-name="townName" :venues="mapVenues" />
    <div class="container mx-auto p-4 my-8">
      <Breadcrumbs :items="breadcrumbItems" />
      <h1 class="text-4xl font-bold mt-6 mb-2">{{ townName }}</h1>

      <SocialShareButtons
        class="mt-4 mb-6"
        :title="`Pubs & events in ${townName}`"
        :path="canonicalPath"
      />

      <nav
        class="flex border-b border-gray-200 dark:border-gray-700 mb-8"
        aria-label="Town sections"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="px-6 py-3 text-lg font-semibold border-b-2 -mb-px transition-colors"
          :class="
            activeTab === tab.id
              ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          "
          :aria-selected="activeTab === tab.id"
          role="tab"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span v-if="tab.count != null" class="ml-1 text-sm font-normal opacity-80">({{ tab.count }})</span>
        </button>
      </nav>

      <section v-show="activeTab === 'venues'" role="tabpanel" aria-label="Venues">
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

      <section v-show="activeTab === 'events'" role="tabpanel" aria-label="Events">
        <h2 class="text-3xl font-bold mb-4">Events in {{ townName }}</h2>
        <ul v-if="townEvents.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <li v-for="(event, index) in townEvents" :key="event.id">
            <event-listing :event="event" :index="index" />
          </li>
        </ul>
        <p v-else class="text-lg text-gray-600">No upcoming events in this town.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useEventStore } from '@/store/event.js'

const VENUE_PAGE_SIZE = 104

import { sortEventsByStartAsc } from '@/utils/sort-events'

const route = useRoute()
const requestFetch = useRequestFetch()
const townSlug = String(route.params.town)

const { data: townData, error } = await useAsyncData(`town-${townSlug}`, () =>
  requestFetch(`/api/towns/${townSlug}`),
)

if (error.value || !townData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Town not found' })
}

const resolvedTownName = townData.value.townName ?? townData.value.cityName
const townName = computed(() => townData.value?.cityName ?? String(townSlug))
const townEvents = computed(() => sortEventsByStartAsc(townData.value?.events ?? []))
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
const activeTab = ref('venues')

const tabs = computed(() => [
  { id: 'venues', label: 'Venues', count: venueTotal.value || null },
  { id: 'events', label: 'Events', count: townEvents.value.length || null },
])

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
