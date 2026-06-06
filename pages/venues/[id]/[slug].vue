<template>
  <div v-if="!venue" class="container mx-auto p-4 py-8 text-lg text-gray-600">
    Loading venue…
  </div>
  <div v-else>
    <div class="w-full">
      <img
        v-if="venuePhotoUrl"
        :src="venuePhotoUrl"
        :alt="`${venue.venuename} in ${venueTownLabel || venue.town}`"
        class="w-full h-auto max-h-[480px] object-cover"
      />
      <div v-else class="w-full h-48 bg-gray-300 dark:bg-gray-700" />

      <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div class="container mx-auto px-4 py-5">
          <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {{ venue.venuename }}
            <span v-if="venueTownLabel" class="block md:inline text-xl md:text-2xl font-normal text-gray-600 dark:text-gray-400 md:ml-2">
              — {{ venueTownLabel }}<template v-if="venueCountyLabel">, {{ venueCountyLabel }}</template>
            </span>
          </h1>
        </div>
      </div>
    </div>

    <div class="container mx-auto p-4 py-8">
      <Breadcrumbs :items="breadcrumbItems" />

      <nav
        v-if="hasVenueEvents"
        class="flex border-b border-gray-200 dark:border-gray-700 mt-6 mb-8"
        aria-label="Venue sections"
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

      <div v-show="!hasVenueEvents || activeTab === 'venue'" role="tabpanel" aria-label="Venue details">
        <div class="venue-desc max-w-3xl">
            <h2 class="text-3xl font-bold">Address</h2>
            <p class="text-2xl">{{ venueAddressLine || '—' }}</p>
            <p v-if="venuePhone" class="text-xl mt-3">
              <a :href="`tel:${venuePhone.replace(/\s/g, '')}`" class="text-amber-600 hover:underline">{{ venuePhone }}</a>
            </p>
            <p v-if="venueWebsiteHref" class="text-xl mt-2">
              <a :href="venueWebsiteHref" target="_blank" rel="noopener noreferrer" class="text-amber-600 hover:underline break-all">
                {{ venueWebsiteLabel }}
              </a>
            </p>
            <h2 class="text-3xl mt-6 font-bold">City / Region</h2>
            <p class="text-2xl">
              {{ venueTownLabel || '—' }} / {{ venueRegion }}<template v-if="venuePostcode"> / {{ venuePostcode }}</template>
            </p>
        </div>

        <section v-if="venueDescription" class="my-8">
          <h2 class="text-3xl font-bold">About</h2>
          <p class="text-xl text-gray-700 dark:text-gray-300 mt-3 leading-relaxed">{{ venueDescription }}</p>
        </section>

        <section v-if="venueFeatureItems.length" class="my-8">
          <h2 class="text-3xl font-bold">Features</h2>
          <ul class="list-disc list-inside text-xl mt-3 space-y-2 text-gray-700 dark:text-gray-300">
            <li v-for="(item, index) in venueFeatureItems" :key="index">{{ item }}</li>
          </ul>
        </section>

        <section v-if="venueHasMapCoords" class="my-10">
          <h2 class="text-4xl font-bold mb-2">Other pubs close by</h2>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Venues within {{ nearbyRadiusMiles }} mile{{ nearbyRadiusMiles === 1 ? '' : 's' }} of this pub.
          </p>
          <p v-if="nearbyPending" class="text-lg text-gray-600">Loading nearby venues…</p>
          <p v-else-if="!nearbyPubs.length" class="text-lg text-gray-600">
            No other venues found within {{ nearbyRadiusMiles }} mile{{ nearbyRadiusMiles === 1 ? '' : 's' }}.
          </p>
          <template v-else>
            <TransitionGroup
              tag="ul"
              name="nearby-reveal"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <li
                v-for="(near, index) in visibleNearbyPubs"
                :key="near.id"
                :style="nearbyItemStyle(index)"
              >
                <VenueHubCard :venue="near">
                  <template #footer>
                    <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
                      {{ formatDistanceMiles(near.distanceMiles) }} away
                    </p>
                  </template>
                </VenueHubCard>
              </li>
            </TransitionGroup>
            <p v-if="hiddenNearbyCount > 0 && !showAllNearby" class="mt-6 text-center">
              <button
                type="button"
                class="text-lg font-semibold text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-500"
                @click="showAllNearby = true"
              >
                Show more within a mile
              </button>
            </p>
          </template>
        </section>

        <section v-if="!hasVenueEvents" class="my-10">
          <h2 class="text-3xl font-bold mb-4">Events</h2>
          <p class="text-lg text-gray-600">No upcoming events at this venue.</p>
        </section>
      </div>

      <div v-show="hasVenueEvents && activeTab === 'events'" role="tabpanel" aria-label="Venue events">
        <h2 class="text-3xl font-bold mb-6">Events at {{ venue.venuename }}</h2>
        <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <li v-for="(event, index) in venueEvents" :key="event.id">
            <event-listing :event="event" :index="index" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useEventStore } from '@/store/event.js'
import { buildVenueBreadcrumbItems } from '@/composables/useVenueBreadcrumbs'
import {
  cleanDbString,
  formatDistanceMiles,
  formatPhone,
  formatPlaceName,
  normalizeWebsiteHref,
  parseVenueFeatures,
  resolveVenuePhotoUrl,
  venueHasCoords,
} from '@/utils/format-venue'

import { sortEventsByStartAsc } from '@/utils/sort-events'

const NEARBY_INITIAL = 9

const route = useRoute()
const config = useRuntimeConfig()
const eventStore = useEventStore()
const requestFetch = useRequestFetch()

const venueId = getRouteParam(route.params.id)
const slugFromRoute = getRouteParam(route.params.slug)

const activeTab = ref('venue')
const showAllNearby = ref(false)

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

const { data: townRef } = await useAsyncData(
  `venue-town-${venueId}`,
  () => {
    const town = cleanDbString(venue.value?.town)
    if (!town) return Promise.resolve(null)
    return requestFetch(`/api/towns/resolve?town=${encodeURIComponent(town)}`)
  },
)

const { data: countyRef } = await useAsyncData(
  `venue-county-${venueId}`,
  () => {
    const county = cleanDbString(venue.value?.county)
    if (!county) return Promise.resolve(null)
    return requestFetch(`/api/counties/resolve?county=${encodeURIComponent(county)}`)
  },
)

const { data: events } = await useAsyncData(
  `venue-events-${venueId}`,
  () => requestFetch(`/api/events/venue/${venueId}`),
  { default: () => [] },
)

const { data: nearbyData, pending: nearbyPending } = await useAsyncData(
  `venue-nearby-${venueId}`,
  () =>
    venueHasCoords(venue.value)
      ? requestFetch(`/api/venues/${venueId}/nearby`)
      : Promise.resolve({ items: [], radiusMiles: 1 }),
  { default: () => ({ items: [], radiusMiles: 1 }) },
)

const venueEvents = computed(() => sortEventsByStartAsc(events.value ?? []))
const hasVenueEvents = computed(() => venueEvents.value.length > 0)
const nearbyPubs = computed(() => nearbyData.value?.items ?? [])
const nearbyRadiusMiles = computed(() => nearbyData.value?.radiusMiles ?? 1)

const visibleNearbyPubs = computed(() => {
  if (showAllNearby.value) return nearbyPubs.value
  return nearbyPubs.value.slice(0, NEARBY_INITIAL)
})

const hiddenNearbyCount = computed(() =>
  Math.max(0, nearbyPubs.value.length - NEARBY_INITIAL),
)

const tabs = computed(() => [
  { id: 'venue', label: 'Venue' },
  { id: 'events', label: 'Events', count: venueEvents.value.length || null },
])

function nearbyItemStyle(index) {
  if (!showAllNearby.value || index < NEARBY_INITIAL) return undefined
  return { transitionDelay: `${(index - NEARBY_INITIAL) * 60}ms` }
}

const venueTownLabel = computed(() => formatPlaceName(venue.value?.town))
const venueCountyLabel = computed(() => formatPlaceName(venue.value?.county))

const venueAddressLine = computed(() => {
  const v = venue.value
  if (!v) return ''
  return [cleanDbString(v.address), cleanDbString(v.address2)]
    .filter(Boolean)
    .join(', ')
})

const venueRegion = computed(() => {
  const v = venue.value
  if (!v) return '—'
  const r = cleanDbString(v.local_authority) || cleanDbString(v.county)
  return r ? formatPlaceName(r) : '—'
})

const venuePostcode = computed(() => cleanDbString(venue.value?.postcode) || cleanDbString(venue.value?.postalsearch) || '')

const venuePhone = computed(() => formatPhone(venue.value?.telephone))

const venueWebsiteHref = computed(() => normalizeWebsiteHref(venue.value?.website))

const venueWebsiteLabel = computed(() => cleanDbString(venue.value?.website) || venueWebsiteHref.value)

const venueHasMapCoords = computed(() => venueHasCoords(venue.value))

const photoConfig = computed(() => ({
  venueImgFolder: config.public.venueImgFolder,
  supabaseUrl: config.public.supabase?.url,
}))

const venuePhotoUrl = computed(() => resolveVenuePhotoUrl(venue.value?.photo, photoConfig.value))

const venueDescription = computed(() => cleanDbString(venue.value?.description))

const venueFeatureItems = computed(() => parseVenueFeatures(venue.value?.features))

const breadcrumbItems = computed(() =>
  buildVenueBreadcrumbItems({
    venue: venue.value,
    townRef: townRef.value,
    countyRef: countyRef.value,
  }),
)

const v = venue.value
const canonicalPath = venuePath(v.id, v.slug)
const siteUrl = siteBaseUrl()
useSiteSeo({
  title: `${v.venuename} — pub & venue in ${venueTownLabel.value || v.town}, ${venueCountyLabel.value || v.county}`,
  description: `Events, listings and details for ${v.venuename} in ${venueTownLabel.value || v.town}, ${venueCountyLabel.value || v.county}. Find gigs, quizzes and live entertainment near you.`,
  path: canonicalPath,
  jsonLd: [
    venueJsonLd(v, `${siteUrl}${canonicalPath}`),
    breadcrumbJsonLd(breadcrumbItems.value, siteUrl),
  ],
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
})
</script>

<style scoped>
.venue-desc p {
  font-weight: 100;
}

.nearby-reveal-enter-active {
  transition:
    opacity 0.45s ease,
    transform 0.45s ease;
}

.nearby-reveal-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
</style>
