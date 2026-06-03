<template>
  <div class="modal-content">
    <h1 class="text-2xl mb-4">{{ editing ? 'Edit Venue' : 'Add Venue' }}</h1>
    <form @submit.prevent="submitVenue">
      <div class="form-grid">
        <div>
          <label for="venuename">Name</label>
          <UInput v-model="venue.venuename" name="venuename" required />
        </div>
        <div>
          <label for="venuetype">Type</label>
          <USelect v-model="venue.venuetype" :options="types" name="venuetype" />
        </div>
        <div class="form-grid__full">
          <label for="address">Address</label>
          <UInput v-model="venue.address" name="address" />
        </div>
        <div class="form-grid__full">
          <label for="address2">Address line 2</label>
          <UInput v-model="venue.address2" name="address2" />
        </div>
        <div>
          <label for="town">Town</label>
          <UInput v-model="venue.town" name="town" />
        </div>
        <div>
          <label for="county">County</label>
          <UInput v-model="venue.county" name="county" />
        </div>
        <div>
          <label for="postcode">Postcode</label>
          <UInput v-model="venue.postcode" name="postcode" />
        </div>
        <div>
          <label for="telephone">Telephone</label>
          <UInput v-model="venue.telephone" name="telephone" type="tel" />
        </div>
        <div class="form-grid__full">
          <label for="website">Website</label>
          <UInput v-model="venue.website" name="website" type="url" placeholder="https://" />
        </div>
        <div class="form-grid__full">
          <label for="photo">Photo path / URL</label>
          <UInput v-model="venue.photo" name="photo" placeholder="e.g. public/1234567890 or images/venues/..." />
          <p class="text-xs text-gray-500 mt-1">Use the photo upload button on the venues list to upload a file, or paste a path here.</p>
        </div>
        <div>
          <label for="local_authority">Local authority</label>
          <UInput v-model="venue.local_authority" name="local_authority" />
        </div>
        <div>
          <label for="is_live">Live listing</label>
          <USelect v-model="venue.is_live" :options="liveOptions" name="is_live" />
        </div>
        <div>
          <label for="latitude">Latitude</label>
          <UInput v-model="venue.latitude" name="latitude" />
        </div>
        <div>
          <label for="longitude">Longitude</label>
          <UInput v-model="venue.longitude" name="longitude" />
        </div>
      </div>
      <UButton type="submit" class="mt-4" :loading="saving">
        {{ editing ? 'Save Changes' : 'Add Venue' }}
      </UButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useVenueStore } from '@/store/venue.js'

const venueStore = useVenueStore()
const props = defineProps({
  editing: Boolean,
  venueid: Number,
})
const emits = defineEmits(['closeModal'])

const types = ['pub', 'restaurant', 'cafe', 'bar']
const liveOptions = [
  { label: 'Live', value: '1' },
  { label: 'Not live', value: '0' },
]

const saving = ref(false)

const emptyVenue = () => ({
  venuename: '',
  slug: '',
  venuetype: 'pub',
  address: '',
  address2: '',
  town: '',
  county: '',
  postcode: '',
  telephone: '',
  website: '',
  photo: '',
  local_authority: '',
  latitude: '',
  longitude: '',
  is_live: '1',
})

const venue = ref(emptyVenue())

onMounted(async () => {
  if (props.editing && props.venueid && props.venueid > 0) {
    try {
      const venueDetails = await venueStore.fetchVenueDetails(props.venueid)
      if (venueDetails) {
        venue.value = { ...emptyVenue(), ...venueDetails }
      }
    } catch (error) {
      console.error('Error fetching venue details:', error)
    }
  }
})

function generateSlug(venueName: string) {
  return venueName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
}

function buildVenuePayload() {
  const now = new Date().toISOString()
  return {
    venuename: venue.value.venuename,
    slug: venue.value.slug || generateSlug(venue.value.venuename),
    venuetype: venue.value.venuetype || 'pub',
    address: venue.value.address || '',
    address2: venue.value.address2 || '',
    town: venue.value.town || '',
    county: venue.value.county || '',
    postcode: venue.value.postcode || '',
    telephone: venue.value.telephone || '',
    website: venue.value.website || '',
    photo: venue.value.photo || '',
    local_authority: venue.value.local_authority || '',
    latitude: venue.value.latitude || '',
    longitude: venue.value.longitude || '',
    is_live: venue.value.is_live || '1',
    updated_at: now,
    ...(props.editing ? {} : { created_at: now }),
  }
}

const submitVenue = async () => {
  saving.value = true
  try {
    const venueData = buildVenuePayload()

    if (props.editing && props.venueid) {
      await venueStore.editVenue(props.venueid, venueData)
    } else {
      await venueStore.addVenue(venueData)
    }

    emits('closeModal')
  } catch (error) {
    console.error('Error saving venue:', error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-content {
  min-height: 600px;
  overflow-y: auto;
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.form-grid__full {
  grid-column: 1 / -1;
}

form label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
