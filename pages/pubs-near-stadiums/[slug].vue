<template>
  <div>
    <CountyHeroHeader
      v-if="stadiumData"
      :title="`Pubs near ${stadiumData.club}`"
      :subtitle="`${stadiumData.stadiumName} — ${stadiumData.pubCount} ${stadiumData.pubCount === 1 ? 'pub' : 'pubs'} within ${stadiumData.radiusMiles} mile${stadiumData.radiusMiles === 1 ? '' : 's'}`"
      :image-url="stadiumData.imageUrl"
      :image-attribution="stadiumData.imageAttribution"
    />
    <div class="container mx-auto p-4 my-8">
      <Breadcrumbs :items="breadcrumbItems" />
      <SocialShareButtons
        v-if="stadiumData"
        class="mt-6"
        :title="shareTitle"
        :path="canonicalPath"
      />
      <div v-if="!stadiumData" class="text-lg text-gray-600">Loading…</div>
      <template v-else>
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

const canonicalPath = computed(() => `/pubs-near-stadiums/${slug}`)
const shareTitle = computed(
  () => `Pubs near ${stadiumData.value?.club} — ${stadiumData.value?.stadiumName}`,
)

useSiteSeo({
  title: `Pubs near ${stadiumData.value.club} — ${stadiumData.value.stadiumName}`,
  description: `Find pubs and venues within ${stadiumData.value.radiusMiles} mile of ${stadiumData.value.stadiumName}, home of ${stadiumData.value.club}.`,
  path: canonicalPath.value,
})
</script>
