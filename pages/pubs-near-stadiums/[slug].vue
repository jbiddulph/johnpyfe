<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />
    <div v-if="!stadiumData" class="text-lg text-gray-600">Loading…</div>
    <template v-else>
      <h1 class="text-4xl font-bold mb-2">Pubs near {{ stadiumData.club }}</h1>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-6">
        {{ stadiumData.stadiumName }} — {{ stadiumData.pubCount }}
        {{ stadiumData.pubCount === 1 ? 'pub' : 'pubs' }} within {{ stadiumData.radiusMiles }} mile{{ stadiumData.radiusMiles === 1 ? '' : 's' }}
      </p>
      <venue-map
        v-if="stadiumHasCoords"
        :venue="stadiumAsVenue"
        :nearby-venues="stadiumData.venues"
        compact
        :show-directions="false"
      />
      <ul v-if="stadiumData.venues.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <li v-for="venue in stadiumData.venues" :key="venue.id">
          <VenueHubCard :venue="venue">
            <template #footer>
              <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
                {{ formatDistanceMiles(venue.distanceMiles) }} from stadium
              </p>
            </template>
          </VenueHubCard>
        </li>
      </ul>
      <p v-else class="text-lg text-gray-600 mt-6">No pubs found within {{ stadiumData.radiusMiles }} mile of this stadium.</p>
    </template>
  </div>
</template>

<script setup>
import { formatDistanceMiles } from '@/utils/format-venue'

const route = useRoute()
const slug = getRouteParam(route.params.slug)
const requestFetch = useRequestFetch()

const { data: stadiumData, error } = await useAsyncData(
  `stadium-${slug}`,
  () => requestFetch(`/api/stadiums/${slug}`),
)

if (error.value || !stadiumData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Stadium not found' })
}

const stadiumHasCoords = computed(() =>
  Number.isFinite(stadiumData.value?.latitude) && Number.isFinite(stadiumData.value?.longitude),
)

const stadiumAsVenue = computed(() => ({
  id: stadiumData.value.id,
  slug: stadiumData.value.slug,
  venuename: stadiumData.value.stadiumName,
  address: '',
  town: '',
  county: '',
  postcode: '',
  latitude: String(stadiumData.value.latitude),
  longitude: String(stadiumData.value.longitude),
}))

const breadcrumbItems = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Pubs near Premier League stadiums', to: '/#premier-league-pubs' },
  { label: stadiumData.value?.club ?? '' },
])

useSiteSeo({
  title: `Pubs near ${stadiumData.value.club} — ${stadiumData.value.stadiumName}`,
  description: `Find pubs and venues within ${stadiumData.value.radiusMiles} mile of ${stadiumData.value.stadiumName}, home of ${stadiumData.value.club}.`,
  path: `/pubs-near-stadiums/${slug}`,
})
</script>
