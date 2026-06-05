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
    <ul v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <li v-for="venue in venues" :key="venue.id">
        <VenueHubCard :venue="venue" />
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
  photo?: string
  telephone?: string
  website?: string
}

const props = defineProps<{
  townName: string
  heading?: string
  town?: string
  /** @deprecated Prefer countySlug — matches all DB spellings for the county. */
  county?: string
  countySlug?: string
  initialItems?: VenueItem[]
  initialTotal?: number
  initialTotalPages?: number
}>()

const requestFetch = useRequestFetch()
const venues = ref<VenueItem[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const loading = ref(false)

function applyInitialPage() {
  if (props.initialItems?.length) {
    venues.value = [...props.initialItems]
    totalCount.value = props.initialTotal ?? props.initialItems.length
    totalPages.value = props.initialTotalPages ?? 1
    currentPage.value = 1
  }
}

async function fetchVenues() {
  if (!props.town && !props.countySlug && !props.county) return

  loading.value = true
  try {
    const skip = (currentPage.value - 1) * VENUE_PAGE_SIZE
    const params = new URLSearchParams({
      skip: String(skip),
      take: String(VENUE_PAGE_SIZE),
    })

    let url: string
    if (props.countySlug || props.county) {
      if (props.countySlug) {
        params.set('slug', props.countySlug)
      } else {
        params.set('county', props.county!)
      }
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
    if (currentPage.value === 1 && props.initialItems?.length) {
      applyInitialPage()
    } else {
      venues.value = []
      totalCount.value = 0
      totalPages.value = 1
    }
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
  () => [props.initialItems, props.initialTotal, props.initialTotalPages],
  () => {
    if (currentPage.value === 1) {
      applyInitialPage()
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => [props.town, props.county, props.countySlug],
  () => {
    currentPage.value = 1
    if (props.initialItems?.length) {
      applyInitialPage()
    } else {
      fetchVenues()
    }
  },
)

onMounted(() => {
  applyInitialPage()
  if (!venues.value.length && (props.town || props.countySlug || props.county)) {
    fetchVenues()
  }
})
</script>
