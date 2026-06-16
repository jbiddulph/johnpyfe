<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <label class="block text-sm font-medium">Header images</label>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          Upload up to {{ maxImages }} images. Drag to reorder — order matches your pub page carousel.
        </p>
      </div>
      <label
        v-if="canAddMore"
        class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        :class="{ 'pointer-events-none opacity-60': uploading }"
      >
        <UIcon name="i-heroicons-photo-20-solid" class="h-4 w-4" />
        <span>{{ uploading ? 'Uploading…' : 'Add image(s)' }}</span>
        <input
          type="file"
          class="sr-only"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          :disabled="uploading || deletingIndex >= 0"
          @change="onFilesSelected"
        />
      </label>
    </div>

    <div v-if="uploading" class="space-y-1">
      <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>Uploading header image{{ uploadTotal > 1 ? 's' : '' }}…</span>
        <span>{{ uploadProgress }}%</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          class="h-full rounded-full bg-amber-500 transition-all duration-150 ease-out"
          :style="{ width: `${uploadProgress}%` }"
        />
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <ul v-if="items.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 list-none p-0 m-0">
      <li
        v-for="(item, index) in items"
        :key="item.path"
        class="relative overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
        :class="{
          'ring-2 ring-amber-400 opacity-70': dragIndex === index,
          'border-amber-400': dropIndex === index && dragIndex !== index,
        }"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragend="onDragEnd"
        @dragover.prevent="onDragOver(index)"
        @dragleave="onDragLeave(index)"
        @drop.prevent="onDrop(index)"
      >
        <div
          class="flex cursor-grab items-center gap-2 border-b border-gray-100 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 active:cursor-grabbing dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400"
        >
          <UIcon name="i-heroicons-bars-3-20-solid" class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Slide {{ index + 1 }}</span>
        </div>
        <img
          :src="item.preview"
          :alt="`Header image ${index + 1}`"
          class="aspect-[16/9] w-full object-cover pointer-events-none"
          loading="lazy"
          draggable="false"
        />
        <button
          type="button"
          class="absolute right-2 top-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 disabled:opacity-50"
          :disabled="uploading || deletingIndex >= 0"
          :aria-label="`Remove image ${index + 1}`"
          @click="removeImage(index)"
        >
          <UIcon name="i-heroicons-x-mark-20-solid" class="h-4 w-4" />
        </button>

        <div
          v-if="deletingIndex === index"
          class="absolute inset-0 flex flex-col justify-end bg-black/45 p-3"
        >
          <div class="flex justify-between text-xs font-medium text-white">
            <span>Deleting…</span>
            <span>{{ deleteProgress }}%</span>
          </div>
          <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/30">
            <div
              class="h-full rounded-full bg-white transition-all duration-150 ease-out"
              :style="{ width: `${deleteProgress}%` }"
            />
          </div>
        </div>
      </li>
    </ul>

    <p v-else class="text-sm text-gray-500 dark:text-gray-400">
      No header images yet. Add photos of your pub, beer garden, or bar.
    </p>
  </section>
</template>

<script setup lang="ts">
import { authDeleteWithProgress, authUploadWithProgress } from '@/composables/useAuthUpload'
import { MAX_VENUE_HEADER_IMAGES, resolveVenueHeaderImageUrl } from '@/utils/venue-headers'

const props = defineProps<{
  venueId: number
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  updated: []
}>()

const maxImages = MAX_VENUE_HEADER_IMAGES
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadTotal = ref(0)
const deletingIndex = ref(-1)
const deleteProgress = ref(0)
const errorMessage = ref('')
const dragIndex = ref(-1)
const dropIndex = ref(-1)

const config = useRuntimeConfig()

const paths = computed({
  get: () => props.modelValue,
  set: (value: string[]) => emit('update:modelValue', value),
})

const items = computed(() =>
  paths.value.map((path) => ({
    path,
    preview: resolveVenueHeaderImageUrl(path, config.public.supabase?.url),
  })),
)

const canAddMore = computed(() => paths.value.length < maxImages)

function setPaths(next: string[], persist = false) {
  paths.value = next
  if (persist) emit('updated')
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
  uploadProgress.value = 0
  uploadTotal.value = batch.length
  errorMessage.value = ''

  try {
    const uploaded: string[] = []
    for (let i = 0; i < batch.length; i++) {
      const file = batch[i]
      const formData = new FormData()
      formData.append('file', file)

      const basePercent = (i / batch.length) * 100
      const result = await authUploadWithProgress<{ path: string; url: string }>(
        `/api/dashboard/venues/${props.venueId}/header-images`,
        formData,
        (filePercent) => {
          uploadProgress.value = Math.round(basePercent + filePercent / batch.length)
        },
      )
      uploaded.push(result.path)
    }

    uploadProgress.value = 100
    setPaths([...paths.value, ...uploaded], true)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    errorMessage.value = message
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    uploadTotal.value = 0
  }
}

async function removeImage(index: number) {
  const path = paths.value[index]
  if (!path) return

  deletingIndex.value = index
  deleteProgress.value = 0
  errorMessage.value = ''

  try {
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      await authDeleteWithProgress(
        `/api/dashboard/venues/${props.venueId}/header-images`,
        { path },
        (percent) => {
          deleteProgress.value = percent
        },
      )
    } else {
      deleteProgress.value = 100
    }

    const next = [...paths.value]
    next.splice(index, 1)
    setPaths(next, true)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not remove image'
    errorMessage.value = message
  } finally {
    deletingIndex.value = -1
    deleteProgress.value = 0
  }
}

function onDragStart(index: number, event: DragEvent) {
  if (uploading.value || deletingIndex.value >= 0) {
    event.preventDefault()
    return
  }
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragEnd() {
  dragIndex.value = -1
  dropIndex.value = -1
}

function onDragOver(index: number) {
  if (dragIndex.value < 0 || dragIndex.value === index) return
  dropIndex.value = index
}

function onDragLeave(index: number) {
  if (dropIndex.value === index) dropIndex.value = -1
}

function onDrop(index: number) {
  const from = dragIndex.value
  onDragEnd()
  if (from < 0 || from === index) return

  const next = [...paths.value]
  const [moved] = next.splice(from, 1)
  next.splice(index, 0, moved)
  setPaths(next, true)
}
</script>
