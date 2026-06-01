<template>
  <div>
    <div class="relative">
      <img
        :src="`/assets/images/headers/${route.params.town}.jpg`"
        :alt="`Events in ${townName}`"
        :title="townName"
        class="w-full h-auto object-cover"
        @error="onHeaderImageError"
      />
      <h1 class="text-6xl md:text-8xl absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
        {{ townName }}
      </h1>
    </div>
    <div class="container mx-auto p-4 my-8">
      <Breadcrumbs :items="breadcrumbItems" />
      <p v-if="countyHub" class="text-lg text-gray-600 dark:text-gray-400 mb-6">
        Part of
        <NuxtLink :to="countyHub.href" class="text-amber-600 hover:underline dark:text-amber-500">
          {{ countyHub.displayName }}
        </NuxtLink>
      </p>
      <TownVenueList :town-name="townName" :town="resolvedTownName" />
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

function onHeaderImageError(event) {
  const img = event.target
  img.style.display = 'none'
}

onMounted(() => {
  const eventStore = useEventStore()
  eventStore.selectedTown = townName.value
  eventStore.townEvents = townEvents.value
})
</script>
