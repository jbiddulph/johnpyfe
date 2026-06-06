<template>
  <div class="modal-content">
    <h2 class="text-2xl">{{ content.event_title }}</h2>
    <h3 class="mt-4">
      Are you sure you want to delete the event titled <strong>{{ content.event_title }}</strong>,
      happening at <strong><i>{{ venueName }}</i></strong> in <strong><i>{{ venueTown }}</i></strong>?
      <br /><br />
      Date/time: {{ content.event_start }}
    </h3>
    <div class="flex items-center justify-end mt-12">
      <UButton label="Cancel" class="mr-2" color="gray" @click="closeModal" />
      <UButton label="Delete" color="red" :loading="deleting" @click="confirmDelete" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventStore } from '@/store/event.js'

const eventStore = useEventStore()
const { $supabase } = useNuxtApp()
const config = useRuntimeConfig()

const props = defineProps({
  content: {
    type: Object,
    default: () => ({}),
  },
})

const emits = defineEmits(['closeModal'])

const venue = ref<Record<string, unknown>>({})
const deleting = ref(false)

const venueId = computed(() => {
  const c = props.content
  return c?.listingId ?? c?.listing?.id ?? c?.venue_id ?? null
})

const venueName = computed(() => {
  const v = venue.value?.venuename ?? props.content?.listing?.venuename
  return v ? String(v) : 'this venue'
})

const venueTown = computed(() => {
  const t = venue.value?.town ?? props.content?.listing?.town ?? props.content?.city?.name
  return t ? String(t) : 'this town'
})

watch(
  () => props.content,
  (content) => {
    if (content?.listing?.venuename) {
      venue.value = content.listing
      return
    }
    const id = content?.listingId ?? content?.listing?.id ?? content?.venue_id
    if (id) {
      fetchVenueDetails(id)
    } else {
      venue.value = {}
    }
  },
  { immediate: true },
)

function closeModal() {
  emits('closeModal')
}

function isSupabaseStoredPhoto(photo: string | null | undefined): boolean {
  if (!photo) return false
  return !/^https?:\/\//i.test(photo)
}

async function removeEventPhotoFromStorage(photo: string) {
  const folder = config.public.eventImgFolder || ''
  const photoPath = folder ? photo.replace(folder, '').replace(/^\/+/, '') : photo.replace(/^\/+/, '')
  if (!photoPath) return

  const { error } = await $supabase.storage.from('event_images').remove([photoPath])
  if (error) {
    console.error('Error deleting photo from Supabase:', error.message)
  }
}

async function confirmDelete() {
  const id = props.content?.id
  if (!id) return

  deleting.value = true
  try {
    const photo = props.content?.photo
    if (isSupabaseStoredPhoto(photo)) {
      await removeEventPhotoFromStorage(String(photo))
    }

    await eventStore.deleteEvent(id)
    await eventStore.fetchAllEvents()
    emits('closeModal')
  } catch (error) {
    console.error('Error deleting event:', error)
  } finally {
    deleting.value = false
  }
}

async function fetchVenueDetails(venueId: number | string) {
  try {
    const response = await fetch(`${config.public.baseURL}/api/venues/${venueId}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) return
    venue.value = await response.json()
  } catch (error) {
    console.error('Error fetching venue details:', error)
  }
}
</script>

<style scoped>
.modal-content {
  min-height: 230px;
  height: auto;
  overflow-y: auto;
  padding: 20px;
}
</style>
