<template>
  <section class="my-10">
    <h2 class="text-3xl font-bold mb-4">Towns in {{ countyName }}</h2>
    <p v-if="totalCount > 0" class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {{ totalCount }} {{ totalCount === 1 ? 'town' : 'towns' }}
      <span v-if="totalPages > 1"> — page {{ currentPage }} of {{ totalPages }}</span>
    </p>

    <div v-if="totalPages > 1" class="flex justify-center mb-4">
      <UButton label="Previous" :disabled="currentPage <= 1" @click="prevPage" />
      <UButton :label="String(currentPage)" class="mx-4" variant="soft" />
      <UButton label="Next" :disabled="currentPage >= totalPages" @click="nextPage" />
    </div>

    <p v-if="!towns.length" class="text-lg text-gray-600">
      No towns listed for this county yet.
    </p>
    <ul v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <li v-for="town in paginatedTowns" :key="town.slug">
        <NuxtLink :to="town.href!" class="hub-card">
          <span class="hub-card__title">{{ town.displayName }}</span>
          <span class="hub-card__meta">
            {{ town.venueCount }} {{ town.venueCount === 1 ? 'venue' : 'venues' }}
          </span>
        </NuxtLink>
      </li>
    </ul>

    <div v-if="totalPages > 1" class="flex justify-center mt-6">
      <UButton label="Previous" :disabled="currentPage <= 1" @click="prevPage" />
      <UButton :label="String(currentPage)" class="mx-4" variant="soft" />
      <UButton label="Next" :disabled="currentPage >= totalPages" @click="nextPage" />
    </div>
  </section>
</template>

<script setup lang="ts">
const TOWN_PAGE_SIZE = 104

const props = defineProps<{
  countyName: string
  towns: Array<{
    slug: string
    displayName: string
    href: string | null
    venueCount: number
  }>
}>()

const currentPage = ref(1)
const totalCount = computed(() => props.towns.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / TOWN_PAGE_SIZE)))

const paginatedTowns = computed(() => {
  const start = (currentPage.value - 1) * TOWN_PAGE_SIZE
  return props.towns.slice(start, start + TOWN_PAGE_SIZE)
})

watch(
  () => props.towns,
  () => {
    currentPage.value = 1
  },
)

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
</script>
