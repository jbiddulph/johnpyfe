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
        <NuxtLink
          :to="town.href!"
          class="block rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-gray-800 transition-colors"
        >
          <span class="font-semibold text-lg text-gray-900 dark:text-white">{{ town.displayName }}</span>
          <span class="block text-sm text-gray-600 dark:text-gray-400 mt-1">
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
