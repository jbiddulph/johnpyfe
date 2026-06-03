<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1 class="text-4xl font-bold mb-4">Browse by county</h1>
    <p v-if="totalCount > 0" class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {{ totalCount }} {{ totalCount === 1 ? 'county' : 'counties' }}
      <span v-if="totalPages > 1"> — page {{ currentPage }} of {{ totalPages }}</span>
    </p>

    <div v-if="totalPages > 1" class="flex justify-center mb-4">
      <UButton label="Previous" :disabled="currentPage <= 1" @click="prevPage" />
      <UButton :label="String(currentPage)" class="mx-4" variant="soft" />
      <UButton label="Next" :disabled="currentPage >= totalPages" @click="nextPage" />
    </div>

    <ul v-if="paginatedCounties.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <li v-for="county in paginatedCounties" :key="county.slug">
        <NuxtLink :to="county.href" class="hub-card">
          <span class="hub-card__title">{{ county.displayName }}</span>
          <span class="hub-card__meta">
            {{ county.venueCount }} {{ county.venueCount === 1 ? 'venue' : 'venues' }}
          </span>
        </NuxtLink>
      </li>
    </ul>
    <p v-else class="text-lg text-gray-600">No counties available yet.</p>

    <div v-if="totalPages > 1" class="flex justify-center mt-6">
      <UButton label="Previous" :disabled="currentPage <= 1" @click="prevPage" />
      <UButton :label="String(currentPage)" class="mx-4" variant="soft" />
      <UButton label="Next" :disabled="currentPage >= totalPages" @click="nextPage" />
    </div>
  </div>
</template>

<script setup>
const COUNTY_PAGE_SIZE = 104

const requestFetch = useRequestFetch()

const { data: countiesData } = await useAsyncData('counties-index', () =>
  requestFetch('/api/counties'),
  { default: () => [] },
)

const allCounties = computed(() => countiesData.value ?? [])
const currentPage = ref(1)
const totalCount = computed(() => allCounties.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / COUNTY_PAGE_SIZE)))

const paginatedCounties = computed(() => {
  const start = (currentPage.value - 1) * COUNTY_PAGE_SIZE
  return allCounties.value.slice(start, start + COUNTY_PAGE_SIZE)
})

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Counties' },
]

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    scrollToTop()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    scrollToTop()
  }
}

function scrollToTop() {
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

useSiteSeo({
  title: 'Browse pubs and events by county',
  description: 'County hub pages for pubs, venues and events across the UK. Pick a county to browse towns and listings.',
  path: '/counties',
})
</script>
