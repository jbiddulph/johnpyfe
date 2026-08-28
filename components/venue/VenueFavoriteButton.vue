<template>
  <div class="flex flex-wrap items-center gap-2">
    <UButton
      v-if="isLoggedIn"
      :color="isFavorite ? 'red' : 'gray'"
      :variant="isFavorite ? 'solid' : 'outline'"
      :icon="isFavorite ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
      :label="isFavorite ? 'Favourited' : 'Add to favourites'"
      :loading="pending"
      :aria-pressed="isFavorite"
      @click="toggle"
    />
    <UButton
      v-else
      color="gray"
      variant="outline"
      icon="i-heroicons-heart"
      label="Favourite this pub"
      :to="loginRedirect"
    />
    <p v-if="message" class="text-sm" :class="messageIsError ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { fetchErrorMessage } from '@/utils/fetch-error'

const props = defineProps<{
  venueId: number
  initialFavorite?: boolean | null
}>()

const emit = defineEmits<{
  'update:favorite': [value: boolean]
}>()

const route = useRoute()
const { isLoggedIn, initializeAuth } = useAuth()

const isFavorite = ref(Boolean(props.initialFavorite))
const pending = ref(false)
const message = ref('')
const messageIsError = ref(false)

const loginRedirect = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))

watch(
  () => props.initialFavorite,
  (value) => {
    if (typeof value === 'boolean') isFavorite.value = value
  },
)

async function loadStatus() {
  if (!isLoggedIn.value) {
    isFavorite.value = false
    return
  }
  try {
    const result = await useAuthFetch<{ isFavorite: boolean }>(`/api/favorites/${props.venueId}`)
    isFavorite.value = result.isFavorite
    emit('update:favorite', result.isFavorite)
  } catch {
    /* keep current */
  }
}

async function toggle() {
  pending.value = true
  message.value = ''
  messageIsError.value = false
  try {
    if (isFavorite.value) {
      await useAuthFetch(`/api/favorites/${props.venueId}`, { method: 'DELETE' })
      isFavorite.value = false
      message.value = 'Removed from your favourites'
    } else {
      await useAuthFetch('/api/favorites', {
        method: 'POST',
        body: { venueId: props.venueId },
      })
      isFavorite.value = true
      message.value = 'Saved to your favourites'
    }
    emit('update:favorite', isFavorite.value)
  } catch (error: unknown) {
    messageIsError.value = true
    message.value = fetchErrorMessage(error, 'Could not update favourite')
  } finally {
    pending.value = false
  }
}

onMounted(async () => {
  await initializeAuth()
  if (typeof props.initialFavorite !== 'boolean') {
    await loadStatus()
  }
})

watch(isLoggedIn, () => {
  loadStatus()
})
</script>
