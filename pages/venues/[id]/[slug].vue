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
    <div class="flex flex-col md:flex-row">
      <img
        :src="venueImageSrc"
        :alt="`${venue.venuename} in ${venueTownLabel || venue.town}`"
        class="w-full md:w-1/2 h-auto object-cover"
      />
      <div class="md:ml-8 venue-desc">
        <h2 class="text-3xl">Address</h2>
        <p class="text-2xl">{{ venueAddressLine || '—' }}</p>
        <h2 class="text-3xl mt-4">City / Region</h2>
        <p class="text-2xl">
          {{ venueTownLabel || '—' }} / {{ venueRegion }}<template v-if="venuePostcode"> / {{ venuePostcode }}</template>
        </p>
        <template v-if="venuePhone">
          <h2 class="text-3xl mt-4">Telephone</h2>
          <p class="text-2xl">
            <a :href="`tel:${venuePhone.replace(/\s/g, '')}`">{{ venuePhone }}</a>
          </p>
        </template>
        <template v-if="venueWebsite">
          <h2 class="text-3xl mt-4">Website</h2>
          <p class="text-2xl">
            <a :href="venueWebsite" target="_blank" rel="noopener noreferrer">{{ venueWebsite }}</a>
          </p>
        </template>
      </div>
    </div>
    <venue-map :venue="venue" />
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
  formatPhone,
  formatPlaceName,
  isValidWebsite,
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

const venueEvents = computed(() => events.value ?? [])

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

const venueWebsite = computed(() => {
  const w = venue.value?.website
  return isValidWebsite(w) ? cleanDbString(w) : null
})

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

const venueImageSrc = computed(() => {
  const v = venue.value
  if (!v?.photo || v.photo === 'images/venues/awaiting.jpg') {
    return '/assets/images/awaiting.jpg'
  }
  const folder = config.public.venueImgFolder || ''
  return `${folder}${v.photo}`
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
