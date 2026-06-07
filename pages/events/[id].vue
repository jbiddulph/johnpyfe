<template>
  <div v-if="event">
    <div class="w-full">
      <div class="aspect-[5/2] max-h-[480px] w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        <NuxtImg
          :src="eventPhotoSrc"
          :alt="event.event_title"
          width="1200"
          height="480"
          sizes="100vw"
          fetchpriority="high"
          loading="eager"
          preset="header"
          class="h-full w-full object-cover"
        />
      </div>
      <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div class="container mx-auto px-4 py-5">
          <p v-if="event.category?.name" class="text-sm font-medium uppercase tracking-wide text-amber-600 dark:text-amber-500 mb-1">
            {{ event.category.name }}
          </p>
          <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {{ event.event_title }}
          </h1>
          <p v-if="venueName" class="mt-2 text-lg text-gray-600 dark:text-gray-400">
            at
            <NuxtLink
              v-if="event.listing"
              :to="venuePath(event.listing.id, event.listing.slug)"
              class="text-amber-600 hover:underline dark:text-amber-500"
            >
              {{ venueName }}
            </NuxtLink>
            <template v-if="townLabel"> · {{ townLabel }}</template>
          </p>
        </div>
      </div>
    </div>

    <div class="container mx-auto p-4 py-8">
      <Breadcrumbs :items="breadcrumbItems" />

      <SocialShareButtons
        class="mt-6"
        :title="event.event_title"
        :path="canonicalPath"
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        <section class="lg:col-span-2 space-y-6">
          <div v-if="event.description" class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 class="text-2xl font-bold mb-3">About this event</h2>
            <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{{ event.description }}</p>
          </div>
        </section>

        <aside class="space-y-4">
          <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 class="text-xl font-bold mb-4">Event details</h2>
            <dl class="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <dt class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">When</dt>
                <dd class="text-lg mt-1">{{ startLabel }}</dd>
              </div>
              <div v-if="event.cost">
                <dt class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cost</dt>
                <dd class="text-lg mt-1">{{ event.cost }}</dd>
              </div>
              <div v-if="event.duration">
                <dt class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Duration</dt>
                <dd class="text-lg mt-1">{{ event.duration }} minutes</dd>
              </div>
              <div v-if="event.city?.name">
                <dt class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Town</dt>
                <dd class="text-lg mt-1">
                  <NuxtLink
                    v-if="townHref"
                    :to="townHref"
                    class="text-amber-600 hover:underline dark:text-amber-500"
                  >
                    {{ event.city.name }}
                  </NuxtLink>
                  <span v-else>{{ event.city.name }}</span>
                </dd>
              </div>
              <div v-if="event.listing">
                <dt class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Venue</dt>
                <dd class="text-lg mt-1">
                  <NuxtLink
                    :to="venuePath(event.listing.id, event.listing.slug)"
                    class="text-amber-600 hover:underline dark:text-amber-500"
                  >
                    {{ event.listing.venuename }}
                  </NuxtLink>
                </dd>
              </div>
              <div v-if="event.website">
                <dt class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tickets / info</dt>
                <dd class="text-lg mt-1">
                  <a :href="event.website" target="_blank" rel="noopener" class="text-amber-600 hover:underline break-all dark:text-amber-500">
                    View event page
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <NuxtLink
            v-if="event.listing"
            :to="venuePath(event.listing.id, event.listing.slug)"
            class="block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            View {{ event.listing.venuename }}
          </NuxtLink>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { buildVenueBreadcrumbItems } from '@/composables/useVenueBreadcrumbs'
import { formatEventStart, resolveEventPhotoUrl } from '@/utils/format-event'
import { cleanDbString, formatPlaceName } from '@/utils/format-venue'

const route = useRoute()
const config = useRuntimeConfig()
const requestFetch = useRequestFetch()
const eventId = route.params.id

const { data: event, error } = await useAsyncData(`event-${eventId}`, () =>
  requestFetch(`/api/events/${eventId}`),
)

if (error.value || !event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found' })
}

const listing = computed(() => event.value?.listing)

const { data: townRef } = await useAsyncData(
  `event-town-${eventId}`,
  () => {
    const town = cleanDbString(listing.value?.town) || cleanDbString(event.value?.city?.name)
    if (!town) return Promise.resolve(null)
    return requestFetch(`/api/towns/resolve?town=${encodeURIComponent(town)}`)
  },
)

const { data: countyRef } = await useAsyncData(
  `event-county-${eventId}`,
  () => {
    const county = cleanDbString(listing.value?.county)
    if (!county) return Promise.resolve(null)
    return requestFetch(`/api/counties/resolve?county=${encodeURIComponent(county)}`)
  },
)

const eventPhotoSrc = computed(() =>
  resolveEventPhotoUrl(event.value?.photo, {
    eventImgFolder: config.public.eventImgFolder,
  }),
)

const startLabel = computed(() => {
  const formatted = formatEventStart(event.value?.event_start)
  if (!formatted.label) return '—'
  return formatted.time ? formatted.label : `${formatted.label} (all day)`
})

const venueName = computed(() => listing.value?.venuename || null)
const townLabel = computed(() => formatPlaceName(listing.value?.town || event.value?.city?.name))
const townHref = computed(() => {
  if (townRef.value?.href) return townRef.value.href
  const slug = event.value?.city?.slug
  return slug ? townPath(slug) : null
})

const venueLink = computed(() => {
  const v = listing.value
  if (!v?.id) return null
  return venuePath(v.id, v.slug)
})

const breadcrumbItems = computed(() =>
  buildVenueBreadcrumbItems({
    venue: listing.value || {
      venuename: venueName.value || 'Venue',
      town: listing.value?.town || event.value?.city?.name,
      county: listing.value?.county,
    },
    townRef: townRef.value,
    countyRef: countyRef.value,
    venueLink: venueLink.value,
    currentLabel: event.value?.event_title,
  }),
)

const canonicalPath = `/events/${event.value.id}`
const seoTitle = `${event.value.event_title}${venueName.value ? ` at ${venueName.value}` : ''}`
const seoDescription =
  event.value.description?.slice(0, 160) ||
  `${event.value.event_title}${townLabel.value ? ` in ${townLabel.value}` : ''} — find pubs, gigs and events on UK Pubs.`

useSiteSeo({
  title: seoTitle,
  description: seoDescription,
  path: canonicalPath,
  type: 'article',
  jsonLd: [
    eventJsonLd(event.value, `${siteBaseUrl()}${canonicalPath}`),
    breadcrumbJsonLd(breadcrumbItems.value, siteBaseUrl()),
  ],
})
</script>
