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
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30">
        <h1 class="text-5xl md:text-7xl font-bold text-amber-500 drop-shadow-lg px-4 text-center">
          {{ townName }}
        </h1>
      </div>
    </div>
    <div class="relative">
      <TownHeaderMap :town-name="townName" :venues="mapVenues" />
      <div
        v-if="headerImageMissing"
        class="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/25"
      >
        <h1 class="text-5xl md:text-7xl font-bold text-amber-500 drop-shadow-lg px-4 text-center">
          {{ townName }}
        </h1>
      </div>
    </div>
    <div class="container mx-auto p-4 my-8">
      <Breadcrumbs :items="breadcrumbItems" />
      <p v-if="countyHub" class="text-lg text-gray-600 dark:text-gray-400 mb-6">
        Part of
        <NuxtLink :to="countyHub.href" class="text-amber-600 hover:underline dark:text-amber-500">
          {{ countyHub.displayName }}
        </NuxtLink>
      </p>
      <TownVenueList
        :town-name="townName"
        :town="resolvedTownName"
        :initial-items="townVenues.items"
        :initial-total="townVenues.total"
        :initial-total-pages="townVenues.totalPages"
      />
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
      `/api/venues/town?town=${encodeURIComponent(resolvedTownName)}&skip=0&take=500&all=1`,
    ),
  { default: () => ({ items: [], total: 0, totalPages: 1 }) },
)

const townVenues = computed(() => townVenuesData.value ?? { items: [], total: 0, totalPages: 1 })
const mapVenues = computed(() => townVenues.value.items ?? [])

const breadcrumbItems = computed(() => {
  const items = [{ label: 'Home', to: '/' }]
  const county = countyHub.value
  if (county?.href) {
    items.push({ label: 'Counties', to: '/counties' })
    items.push({ label: county.displayName, to: county.href })
  }
  items.push({ label: townName.value })
  return items
})

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
