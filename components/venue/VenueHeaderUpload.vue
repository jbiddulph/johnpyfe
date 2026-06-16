<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <label class="block text-sm font-medium">Header images</label>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          Upload up to {{ maxImages }} images. Multiple images show as a carousel on your pub page.
        </p>
      </div>
      <label
        v-if="canAddMore"
        class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
      >
        <UIcon name="i-heroicons-photo-20-solid" class="h-4 w-4" />
        <span>{{ uploading ? 'Uploading…' : 'Add image(s)' }}</span>
        <input
          type="file"
          class="sr-only"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          :disabled="uploading"
          @change="onFilesSelected"
        />
      </label>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <ul v-if="previewUrls.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 list-none p-0 m-0">
      <li
        v-for="(preview, index) in previewUrls"
        :key="paths[index] || preview"
        class="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <img
          :src="preview"
          :alt="`Header image ${index + 1}`"
          class="aspect-[16/9] w-full object-cover"
          loading="lazy"
        />
        <button
          type="button"
          class="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
          :disabled="removingIndex === index"
          :aria-label="`Remove image ${index + 1}`"
          @click="removeImage(index)"
        >
          <UIcon name="i-heroicons-x-mark-20-solid" class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <p v-else class="text-sm text-gray-500 dark:text-gray-400">
      No header images yet. Add photos of your pub, beer garden, or bar.
    </p>
  </section>
</template>

<script setup lang="ts">
import { MAX_VENUE_HEADER_IMAGES, resolveVenueHeaderImageUrl } from '@/utils/venue-headers'

const props = defineProps<{
  venueId: number
  modelValue: string[]
  previewUrls?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  updated: []
}>()

const maxImages = MAX_VENUE_HEADER_IMAGES
const uploading = ref(false)
const removingIndex = ref(-1)
const errorMessage = ref('')

const paths = computed({
  get: () => props.modelValue,
  set: (value: string[]) => emit('update:modelValue', value),
})

const previewUrls = computed(() => {
  if (props.previewUrls?.length) return props.previewUrls
  return paths.value.map((path) => resolvePreview(path))
})

const canAddMore = computed(() => paths.value.length < maxImages)

function resolvePreview(path: string): string {
  const config = useRuntimeConfig()
  return resolveVenueHeaderImageUrl(path, config.public.supabase?.url)
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''

  if (!files.length) return

  const remaining = maxImages - paths.value.length
  if (remaining <= 0) {
    errorMessage.value = `You can upload up to ${maxImages} header images.`
    return
  }

  const batch = files.slice(0, remaining)
  uploading.value = true
  errorMessage.value = ''

  try {
    const uploaded: string[] = []
    for (const file of batch) {
      const formData = new FormData()
      formData.append('file', file)
      const result = await useAuthFetch<{ path: string; url: string }>(
        `/api/dashboard/venues/${props.venueId}/header-images`,
        { method: 'POST', body: formData },
      )
      uploaded.push(result.path)
    }
    paths.value = [...paths.value, ...uploaded]
    emit('updated')
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Upload failed'
  } finally {
    uploading.value = false
  }
}

async function removeImage(index: number) {
  const path = paths.value[index]
  if (!path) return

  removingIndex.value = index
  errorMessage.value = ''

  try {
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      await useAuthFetch(`/api/dashboard/venues/${props.venueId}/header-images`, {
        method: 'DELETE',
        body: { path },
      })
    }
    const next = [...paths.value]
    next.splice(index, 1)
    paths.value = next
    emit('updated')
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Could not remove image'
  } finally {
    removingIndex.value = -1
  }
}
</script>
