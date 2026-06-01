<template>
  <div>
    <div class="relative">
      <PlaceHeaderMap :place-name="countyDisplayName" :venues="mapVenues" />
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
        <div class="text-center px-4">
          <h1 class="text-4xl md:text-6xl font-light text-white drop-shadow-md">
            Pubs &amp; events in {{ countyDisplayName }}
          </h1>
          <p class="mt-3 text-lg text-white/90 drop-shadow-md max-w-2xl mx-auto">
            Browse towns, venues and what's on across {{ countyDisplayName }}.
          </p>
        </div>
      </div>
    </div>
    <div class="container mx-auto p-4 my-8">
      <Breadcrumbs :items="breadcrumbItems" />
      <CountyTownList :county-name="countyDisplayName" :towns="countyTowns" />
      <TownVenueList
        :town-name="countyDisplayName"
        :heading="`All venues in ${countyDisplayName}`"
        :county="resolvedCountyName"
        :initial-items="initialVenueItems"
        :initial-total="initialVenueTotal"
        :initial-total-pages="initialVenueTotalPages"
      />
      <h2 class="text-4xl font-bold my-8">Events in {{ countyDisplayName }}</h2>
      <ul v-if="countyEvents.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(event, index) in countyEvents" :key="event.id">
          <event-listing :event="event" :index="index" />
        </li>
      </ul>
      <p v-else class="text-lg text-gray-600">No upcoming events in this county.</p>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const requestFetch = useRequestFetch()
const countySlug = String(route.params.county)

const { data: countyData, error } = await useAsyncData(`county-${countySlug}`, () =>
  requestFetch(`/api/counties/${countySlug}`),
)

if (error.value || !countyData.value) {
  throw createError({ statusCode: 404, statusMessage: 'County not found' })
}

const resolvedCountyName = countyData.value.countyName ?? ''
const countyDisplayName = computed(() => countyData.value?.displayName ?? countySlug)
const countyTowns = computed(() => countyData.value?.towns ?? [])
const countyEvents = computed(() => countyData.value?.events ?? [])
const canonicalPath = countyPath(countySlug)

const { data: countyVenuesData } = await useAsyncData(
  `county-venues-${countySlug}`,
  () =>
    requestFetch(
      `/api/venues/county?county=${encodeURIComponent(resolvedCountyName)}&skip=0&take=104`,
    ),
  { default: () => ({ items: [], total: 0, totalPages: 1 }) },
)

const { data: mapVenuesData } = await useAsyncData(
  `county-map-venues-${countySlug}`,
  () =>
    requestFetch(
      `/api/venues/county?county=${encodeURIComponent(resolvedCountyName)}&skip=0&take=500&all=1`,
    ),
  { default: () => ({ items: [] }) },
)

const initialVenueItems = computed(() => countyVenuesData.value?.items ?? [])
const initialVenueTotal = computed(() => countyVenuesData.value?.total ?? 0)
const initialVenueTotalPages = computed(() => countyVenuesData.value?.totalPages ?? 1)
const mapVenues = computed(() => mapVenuesData.value?.items ?? [])

const breadcrumbItems = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Counties', to: '/counties' },
  { label: countyDisplayName.value },
])

const siteUrl = siteBaseUrl()
useSiteSeo({
  title: `Pubs & events in ${countyDisplayName.value}`,
  description: `Find pubs, venues and upcoming events in ${countyDisplayName.value}. Browse by town and see what's on near you.`,
  path: canonicalPath,
  jsonLd: breadcrumbJsonLd(breadcrumbItems.value, siteUrl),
})
</script>
