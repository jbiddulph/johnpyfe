<template>
  <div class="container mx-auto p-4 my-8 max-w-5xl">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1 class="text-4xl font-bold mb-2">Favourite pubs</h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8">
      Pubs and venues you have saved. Add more from any venue page.
    </p>

    <p v-if="!isLoggedIn" class="text-lg text-gray-600 mb-4">
      <NuxtLink to="/login?redirect=/favorites" class="text-blue-600 hover:underline">Sign in</NuxtLink>
      to save and view your favourite pubs.
    </p>

    <p v-else-if="loading" class="text-gray-600">Loading your favourites…</p>

    <p v-else-if="errorMessage" class="text-red-600 mb-6">{{ errorMessage }}</p>

    <template v-else>
      <p v-if="!items.length" class="text-lg text-gray-600">
        You have not favourited any pubs yet.
        <NuxtLink to="/venues" class="text-blue-600 hover:underline">Browse venues</NuxtLink>
        and tap the heart on a pub you like.
      </p>

      <ul v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
        <li v-for="item in items" :key="item.id">
          <VenueHubCard :venue="item.venue">
            <template #footer>
              <div class="flex justify-center">
                <UButton
                  color="red"
                  variant="soft"
                  icon="i-heroicons-heart-solid"
                  label="Remove"
                  :loading="removingId === item.venueId"
                  @click="removeFavorite(item.venueId)"
                />
              </div>
            </template>
          </VenueHubCard>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { fetchErrorMessage } from '@/utils/fetch-error'

type FavoriteItem = {
  id: string
  venueId: number
  createdAt: string
  venue: {
    id: number
    venuename: string
    slug: string
    town: string
    county: string
    address: string
    postcode: string
    photo: string
    website: string
  }
}

const { isLoggedIn, initializeAuth } = useAuth()

const loading = ref(true)
const errorMessage = ref('')
const items = ref<FavoriteItem[]>([])
const removingId = ref<number | null>(null)

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Favourite pubs' },
]

async function loadFavorites() {
  if (!isLoggedIn.value) {
    loading.value = false
    items.value = []
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const result = await useAuthFetch<{ items: FavoriteItem[] }>('/api/favorites')
    items.value = result.items || []
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Failed to load favourites')
    items.value = []
  } finally {
    loading.value = false
  }
}

async function removeFavorite(venueId: number) {
  removingId.value = venueId
  errorMessage.value = ''
  try {
    await useAuthFetch(`/api/favorites/${venueId}`, { method: 'DELETE' })
    items.value = items.value.filter((item) => item.venueId !== venueId)
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Could not remove favourite')
  } finally {
    removingId.value = null
  }
}

onMounted(async () => {
  await initializeAuth()
  await loadFavorites()
})

watch(isLoggedIn, () => {
  loadFavorites()
})

useSiteSeo({
  title: 'Favourite pubs',
  description: 'Your saved favourite pubs and venues on UK Pubs.',
  path: '/favorites',
})
</script>
