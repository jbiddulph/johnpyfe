<template>
  <div v-if="!venue" class="container mx-auto p-4 py-8 text-lg text-gray-600">
    Loading venue…
  </div>
  <div v-else class="container mx-auto p-4">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1 class="text-4xl font-bold my-4">
      {{ venue.venuename }}
      <span v-if="venueTownLabel" class="text-2xl font-normal text-gray-600 dark:text-gray-400">
        — {{ venueTownLabel }}<template v-if="venueCountyLabel">, {{ venueCountyLabel }}</template>
      </span>
    </h1>
    <div class="flex flex-col md:flex-row gap-6">
      <div class="w-full md:w-1/2">
        <img
          v-if="venuePhotoUrl"
          :src="venuePhotoUrl"
          :alt="`${venue.venuename} in ${venueTownLabel || venue.town}`"
          class="w-full h-auto max-h-[420px] object-cover rounded-md"
        />
        <venue-map
          v-else-if="venueHasMapCoords"
          :venue="venue"
          :nearby-venues="nearbyPubs"
          compact
          :show-directions="false"
        />
      </div>
      <div class="md:w-1/2 venue-desc">
        <h2 class="text-3xl">Address</h2>
        <p class="text-2xl">{{ venueAddressLine || '—' }}</p>
        <p v-if="venuePhone" class="text-xl mt-3">
          <a :href="`tel:${venuePhone.replace(/\s/g, '')}`" class="text-amber-600 hover:underline">{{ venuePhone }}</a>
        </p>
        <p v-if="venueWebsiteHref" class="text-xl mt-2">
          <a :href="venueWebsiteHref" target="_blank" rel="noopener noreferrer" class="text-amber-600 hover:underline break-all">
            {{ venueWebsiteLabel }}
          </a>
        </p>
        <h2 class="text-3xl mt-4">City / Region</h2>
        <p class="text-2xl">
          {{ venueTownLabel || '—' }} / {{ venueRegion }}<template v-if="venuePostcode"> / {{ venuePostcode }}</template>
        </p>
      </div>
    </div>
    <venue-map
      v-if="venuePhotoUrl && venueHasMapCoords"
      :venue="venue"
      :nearby-venues="nearbyPubs"
    />

    <section v-if="venueHasMapCoords" class="my-10">
      <h2 class="text-4xl font-bold mb-2">Other pubs close by</h2>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
        Venues within {{ nearbyRadiusMiles }} mile{{ nearbyRadiusMiles === 1 ? '' : 's' }} of this pub.
      </p>
      <p v-if="nearbyPending" class="text-lg text-gray-600">Loading nearby venues…</p>
      <p v-else-if="!nearbyPubs.length" class="text-lg text-gray-600">
        No other venues found within {{ nearbyRadiusMiles }} mile{{ nearbyRadiusMiles === 1 ? '' : 's' }}.
      </p>
      <ul v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <li v-for="near in nearbyPubs" :key="near.id">
          <VenueHubCard :venue="near">
            <template #footer>
              <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
                {{ formatDistanceMiles(near.distanceMiles) }} away
              </p>
            </template>
          </VenueHubCard>
        </li>
      </ul>
    </section>

    <h2 class="text-4xl font-bold my-8">Events</h2>
    <ul v-if="venueEvents.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <li v-for="(event, index) in venueEvents" :key="event.id">
        <event-listing :event="event" :index="index" />
      </li>
    </ul>
    <p v-else class="text-lg text-gray-600">No upcoming events at this venue.</p>
  </div>
</template>

<script setup>
import { useEventStore } from '@/store/event.js'
import {
  cleanDbString,
  formatDistanceMiles,
  formatPhone,
  formatPlaceName,
  normalizeWebsiteHref,
  resolveVenuePhotoUrl,
  venueHasCoords,
} from '@/utils/format-venue'

const route = useRoute()
const config = useRuntimeConfig()
const eventStore = useEventStore()
const requestFetch = useRequestFetch()

const venueId = getRouteParam(route.params.id)
const slugFromRoute = getRouteParam(route.params.slug)

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

const venueEvents = computed(() => events.value ?? [])
const nearbyPubs = computed(() => nearbyData.value?.items ?? [])
const nearbyRadiusMiles = computed(() => nearbyData.value?.radiusMiles ?? 1)

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

const breadcrumbItems = computed(() => {
  const v = venue.value
  if (!v) return []
  const items = [{ label: 'Home', to: '/' }]
  const cr = countyRef.value
  if (cr?.href) {
    items.push({ label: 'Counties', to: '/counties' })
    items.push({ label: cr.name || venueCountyLabel.value, to: cr.href })
  } else if (cleanDbString(v.county)) {
    items.push({ label: venueCountyLabel.value })
  }
  const tr = townRef.value
  if (tr?.href) {
    items.push({ label: tr.name || venueTownLabel.value, to: tr.href })
  } else if (cleanDbString(v.town)) {
    items.push({ label: venueTownLabel.value })
  }
  items.push({ label: v.venuename })
  return items
})

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
</style>
