<template>
  <div>
    <div class="bg-gray-800 text-white py-16 md:py-24">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-4xl md:text-6xl font-bold drop-shadow-md">
          Pubs &amp; events in {{ countyDisplayName }}
        </h1>
        <p class="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
          Browse towns, venues and what's on across {{ countyDisplayName }}.
        </p>
      </div>
    </div>
    <div class="container mx-auto p-4 my-8">
      <Breadcrumbs :items="breadcrumbItems" />
      <CountyTownList :county-name="countyDisplayName" :towns="countyTowns" />
      <TownVenueList
        :town-name="countyDisplayName"
        :heading="`All venues in ${countyDisplayName}`"
        :county="countyNameForApi"
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

const countyDisplayName = computed(() => countyData.value?.displayName ?? countySlug)
const countyNameForApi = computed(() => countyData.value?.countyName ?? '')
const countyTowns = computed(() => countyData.value?.towns ?? [])
const countyEvents = computed(() => countyData.value?.events ?? [])
const canonicalPath = countyPath(countySlug)

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
