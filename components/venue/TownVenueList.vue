<template>
  <section class="my-10">
    <h2 class="text-3xl font-bold mb-4">{{ heading || `Pubs and venues in ${townName}` }}</h2>
    <p v-if="totalCount > 0" class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {{ totalCount }} {{ totalCount === 1 ? 'venue' : 'venues' }}
      <span v-if="totalPages > 1"> — page {{ currentPage }} of {{ totalPages }}</span>
    </p>

    <div v-if="totalPages > 1" class="flex justify-center mb-4 mt-2">
      <UButton label="Previous" :disabled="currentPage <= 1 || loading" @click="prevPage" />
      <UButton :label="String(currentPage)" class="mx-4" variant="soft" />
      <UButton label="Next" :disabled="currentPage >= totalPages || loading" @click="nextPage" />
    </div>

    <p v-if="loading && !venues.length" class="text-lg text-gray-600">Loading venues…</p>
    <p v-else-if="!venues.length" class="text-lg text-gray-600">
      No venue listings{{ town ? ` for this town` : county ? ` in this county` : '' }} yet.
    </p>
    <ul v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <li v-for="venue in venues" :key="venue.id">
        <NuxtLink
          :to="venuePath(venue.id, venue.slug)"
          class="group block rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-gray-800 transition-colors"
        >
          <span class="font-semibold text-lg text-amber-600 group-hover:underline dark:text-amber-500">
            {{ venue.venuename }}
          </span>
          <span v-if="venueAddress(venue)" class="block text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ venueAddress(venue) }}
          </span>
        </NuxtLink>
      </li>
    </ul>

    <div v-if="totalPages > 1" class="flex justify-center mt-6">
      <UButton label="Previous" :disabled="currentPage <= 1 || loading" @click="prevPage" />
      <UButton :label="String(currentPage)" class="mx-4" variant="soft" />
      <UButton label="Next" :disabled="currentPage >= totalPages || loading" @click="nextPage" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { cleanDbString } from '@/utils/format-venue'

const VENUE_PAGE_SIZE = 104

type VenueItem = {
  id: number
  slug: string
  venuename: string
  address?: string
  town?: string
  postcode?: string
  latitude?: string
  longitude?: string
}

const props = defineProps<{
  townName: string
  heading?: string
  town?: string
  county?: string
  initialItems?: VenueItem[]
  initialTotal?: number
  initialTotalPages?: number
}>()

const requestFetch = useRequestFetch()
const venues = ref<VenueItem[]>(props.initialItems ?? [])
const currentPage = ref(1)
const totalPages = ref(props.initialTotalPages ?? 1)
const totalCount = ref(props.initialTotal ?? props.initialItems?.length ?? 0)
const loading = ref(false)

function venueAddress(venue: VenueItem) {
  return [cleanDbString(venue.address), cleanDbString(venue.postcode)]
    .filter(Boolean)
    .join(', ')
}

async function fetchVenues() {
  if (!props.town && !props.county) return

  loading.value = true
  try {
    const skip = (currentPage.value - 1) * VENUE_PAGE_SIZE
    const params = new URLSearchParams({
      skip: String(skip),
      take: String(VENUE_PAGE_SIZE),
    })

    let url: string
    if (props.county) {
      params.set('county', props.county)
      url = `/api/venues/county?${params}`
    } else {
      params.set('town', props.town!)
      url = `/api/venues/town?${params}`
    }

    const data = await requestFetch<{
      items: VenueItem[]
      total: number
      totalPages: number
    }>(url)

    venues.value = data.items ?? []
    totalCount.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 1
  } catch {
    venues.value = []
    totalCount.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchVenues()
    scrollToTop()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchVenues()
    scrollToTop()
  }
}

function scrollToTop() {
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

watch(
  () => [props.town, props.county],
  () => {
    currentPage.value = 1
    fetchVenues()
  },
)

onMounted(() => {
  if (!venues.value.length && (props.town || props.county)) {
    fetchVenues()
  }
})
</script>
