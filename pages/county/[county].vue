<template>
  <div>
    <CountyHeroHeader
      :title="`Pubs & events in ${countyDisplayName}`"
      :subtitle="`Browse towns, venues and what's on across ${countyDisplayName}.`"
      :image-url="countyImageUrl"
      :image-attribution="countyImageAttribution"
    />
    <div class="container mx-auto p-4 my-8">
      <Breadcrumbs :items="breadcrumbItems" />
      <SocialShareButtons
        class="mt-6"
        :title="`Pubs & events in ${countyDisplayName}`"
        :path="canonicalPath"
      />
      <CountyTownList
        :county-name="countyDisplayName"
        :county-slug="countySlug"
        :towns="countyTowns"
        :map-venues="mapVenues"
      />
      <TownVenueList
        :town-name="countyDisplayName"
        :heading="`All venues in ${countyDisplayName}`"
        :county-slug="countySlug"
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
import { sortEventsByStartAsc } from '@/utils/sort-events'
import {
  countySeoDescription,
  countySeoHeadline,
  countySeoKeywords,
} from '@/utils/site-seo-copy'

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
const countyEvents = computed(() => sortEventsByStartAsc(countyData.value?.events ?? []))
const countyImageUrl = computed(() => countyData.value?.imageUrl ?? null)
const countyImageAttribution = computed(() => countyData.value?.imageAttribution ?? null)
const canonicalPath = countyPath(countySlug)

const { data: countyVenuesData } = await useAsyncData(
  `county-venues-${countySlug}`,
  () =>
    requestFetch(
      `/api/venues/county?slug=${encodeURIComponent(countySlug)}&skip=0&take=104`,
    ),
  { default: () => ({ items: [], total: 0, totalPages: 1 }) },
)

const { data: mapVenuesData } = await useAsyncData(
  `county-map-venues-${countySlug}`,
  () =>
    requestFetch(
      `/api/venues/county?slug=${encodeURIComponent(countySlug)}&skip=0&take=500&all=1`,
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

const seoTitle = computed(() => countySeoHeadline(countyDisplayName.value))
const seoDescription = computed(() => countySeoDescription(countyDisplayName.value))
const seoKeywords = computed(() => countySeoKeywords(countyDisplayName.value))

watchEffect(() => {
  useSiteSeo({
    title: seoTitle.value,
    description: seoDescription.value,
    keywords: seoKeywords.value,
    path: canonicalPath,
    jsonLd: breadcrumbJsonLd(breadcrumbItems.value, siteUrl),
  })
})
</script>
