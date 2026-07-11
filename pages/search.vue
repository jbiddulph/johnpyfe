<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />

    <h1 class="text-4xl font-bold mb-6">Search</h1>

    <form
      class="mb-8 max-w-3xl"
      role="search"
      aria-label="Search pubs, towns and counties"
      @submit.prevent="submitSearch"
    >
      <div class="relative flex items-center rounded-full bg-white shadow-md ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        <label for="site-search-input" class="sr-only">Search pubs, towns and counties</label>
        <input
          id="site-search-input"
          v-model="query"
          type="search"
          autocomplete="off"
          placeholder="Search by pub name, town, or county…"
          class="site-search__input w-full rounded-full border-0 bg-transparent py-3 pl-5 pr-14 text-base text-gray-900 outline-none placeholder:text-gray-500 dark:text-white md:py-4 md:pl-7 md:pr-16"
        />
        <button
          type="submit"
          class="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-amber-600 text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 md:right-3 md:h-11 md:w-11"
          :disabled="!canSearch"
          aria-label="Search"
        >
          <UIcon name="i-heroicons-magnifying-glass-20-solid" class="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>
    </form>

    <p v-if="loadError" class="text-red-600 mb-6">{{ loadError }}</p>

    <template v-else-if="activeQuery.length >= 2">
      <p v-if="pending" class="text-gray-600 mb-6">Searching for “{{ activeQuery }}”…</p>

      <template v-else-if="results">
        <p v-if="!hasAnyResults" class="text-lg text-gray-600 mb-6">
          No towns, counties or venues matched “{{ activeQuery }}”. Try a different spelling or browse
          <NuxtLink to="/counties" class="text-amber-600 hover:underline">counties</NuxtLink>.
        </p>

        <section v-if="results.towns.length" class="mb-10">
          <h2 class="text-2xl font-bold mb-4">Towns</h2>
          <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 list-none p-0 m-0">
            <li v-for="town in results.towns" :key="town.slug">
              <NuxtLink :to="town.href" class="hub-card flex items-center justify-between gap-3">
                <span class="hub-card__title">{{ town.displayName }}</span>
                <span class="hub-card__meta shrink-0">
                  {{ town.venueCount }} {{ town.venueCount === 1 ? 'venue' : 'venues' }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section v-if="results.counties.length" class="mb-10">
          <h2 class="text-2xl font-bold mb-4">Counties</h2>
          <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 list-none p-0 m-0">
            <li v-for="county in results.counties" :key="county.slug">
              <NuxtLink :to="county.href" class="hub-card flex items-center justify-between gap-3">
                <span class="hub-card__title">{{ county.displayName }}</span>
                <span class="hub-card__meta shrink-0">
                  {{ county.venueCount }} {{ county.venueCount === 1 ? 'venue' : 'venues' }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section v-if="results.venues.items.length || results.venues.total > 0">
          <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h2 class="text-2xl font-bold">Venues</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ results.venues.total }} {{ results.venues.total === 1 ? 'venue' : 'venues' }}
              <span v-if="venueTotalPages > 1"> — page {{ venuePage }} of {{ venueTotalPages }}</span>
            </p>
          </div>

          <div v-if="venueTotalPages > 1" class="flex justify-center mb-4">
            <UButton label="Previous" :disabled="venuePage <= 1 || pending" @click="prevVenuePage" />
            <UButton :label="String(venuePage)" class="mx-4" variant="soft" />
            <UButton label="Next" :disabled="venuePage >= venueTotalPages || pending" @click="nextVenuePage" />
          </div>

          <ul v-if="results.venues.items.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
            <li v-for="venue in results.venues.items" :key="venue.id">
              <VenueHubCard :venue="venue" />
            </li>
          </ul>
          <p v-else class="text-gray-600">No venue listings matched this search.</p>

          <div v-if="venueTotalPages > 1" class="flex justify-center mt-6">
            <UButton label="Previous" :disabled="venuePage <= 1 || pending" @click="prevVenuePage" />
            <UButton :label="String(venuePage)" class="mx-4" variant="soft" />
            <UButton label="Next" :disabled="venuePage >= venueTotalPages || pending" @click="nextVenuePage" />
          </div>
        </section>
      </template>
    </template>

    <p v-else class="text-lg text-gray-600">
      Enter at least two characters to search pubs, towns and counties across the UK.
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  searchSeoDescription,
  searchSeoHeadline,
  searchSeoKeywords,
} from '@/utils/site-seo-copy'

const route = useRoute()
const router = useRouter()
const requestFetch = useRequestFetch()

const query = ref('')
const activeQuery = ref('')
const venuePage = ref(1)
const loadError = ref('')

type SearchResponse = {
  query: string
  towns: Array<{
    slug: string
    displayName: string
    href: string
    venueCount: number
  }>
  counties: Array<{
    slug: string
    displayName: string
    href: string
    venueCount: number
  }>
  venues: {
    items: Array<Record<string, unknown>>
    total: number
    totalPages: number
  }
}

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Search' },
]

const canSearch = computed(() => query.value.trim().length >= 2)

const { data: results, pending, error } = await useAsyncData(
  'site-search',
  () => {
    if (activeQuery.value.length < 2) {
      return Promise.resolve(null)
    }
    return requestFetch<SearchResponse>('/api/search', {
      query: {
        q: activeQuery.value,
        page: venuePage.value,
      },
    })
  },
  { watch: [activeQuery, venuePage] },
)

watch(error, (value) => {
  loadError.value = value
    ? 'Search failed. Please try again.'
    : ''
})

const venueTotalPages = computed(() => results.value?.venues.totalPages ?? 1)

const hasAnyResults = computed(() => {
  if (!results.value) return false
  return (
    results.value.towns.length > 0
    || results.value.counties.length > 0
    || results.value.venues.total > 0
  )
})

function syncFromRoute() {
  const q = String(route.query.q || '').trim()
  activeQuery.value = q
  query.value = q
  venuePage.value = Math.max(1, Number.parseInt(String(route.query.page || 1), 10) || 1)
}

function submitSearch() {
  const q = query.value.trim()
  if (q.length < 2) return
  router.push({ path: '/search', query: { q } })
}

function prevVenuePage() {
  if (venuePage.value <= 1) return
  router.push({
    path: '/search',
    query: { q: activeQuery.value, page: String(venuePage.value - 1) },
  })
}

function nextVenuePage() {
  if (venuePage.value >= venueTotalPages.value) return
  router.push({
    path: '/search',
    query: { q: activeQuery.value, page: String(venuePage.value + 1) },
  })
}

watch(
  () => route.query,
  () => {
    syncFromRoute()
  },
  { immediate: true, deep: true },
)

const seoTitle = computed(() => searchSeoHeadline(activeQuery.value))
const seoDescription = computed(() => searchSeoDescription(activeQuery.value))
const seoKeywords = computed(() => searchSeoKeywords(activeQuery.value))

watchEffect(() => {
  useSiteSeo({
    title: seoTitle.value,
    description: seoDescription.value,
    keywords: seoKeywords.value,
    path: '/search',
  })
})
</script>

<style scoped>
.site-search__input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.site-search__input {
  -webkit-appearance: none;
  appearance: none;
}
</style>
