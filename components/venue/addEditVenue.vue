<template>
  <div class="modal-content">
    <h1 class="text-2xl mb-4">{{ editing ? 'Edit Venue' : 'Add Venue' }}</h1>
    <form autocomplete="off" novalidate @submit.prevent="submitVenue">
      <input type="text" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <div class="form-grid">
        <div>
          <label for="venue-edit-name">Name</label>
          <UInput
            id="venue-edit-name"
            v-model="venue.venuename"
            name="venue-edit-name"
            autocomplete="off"
            required
          />
        </div>
        <div>
          <label for="venue-edit-type">Type</label>
          <USelect
            id="venue-edit-type"
            v-model="venue.venuetype"
            :options="types"
            name="venue-edit-type"
          />
        </div>
        <div class="form-grid__full">
          <label for="venue-edit-address">Address</label>
          <UInput
            id="venue-edit-address"
            v-model="venue.address"
            name="venue-edit-address"
            autocomplete="off"
          />
        </div>
        <div class="form-grid__full">
          <label for="venue-edit-address2">Address line 2 <span class="text-gray-400 font-normal">(optional)</span></label>
          <UInput
            id="venue-edit-address2"
            v-model="venue.address2"
            name="venue-edit-address2"
            autocomplete="off"
          />
        </div>
        <div>
          <label for="venue-edit-town">Town</label>
          <UInput
            id="venue-edit-town"
            v-model="venue.town"
            name="venue-edit-town"
            autocomplete="off"
          />
        </div>
        <div>
          <label for="venue-edit-county">County</label>
          <UInput
            id="venue-edit-county"
            v-model="venue.county"
            name="venue-edit-county"
            autocomplete="off"
          />
        </div>
        <div>
          <label for="venue-edit-postcode">Postcode</label>
          <UInput
            id="venue-edit-postcode"
            v-model="venue.postcode"
            name="venue-edit-postcode"
            autocomplete="off"
          />
        </div>
        <div>
          <label for="venue-edit-telephone">Telephone <span class="text-gray-400 font-normal">(optional)</span></label>
          <UInput
            id="venue-edit-telephone"
            v-model="venue.telephone"
            name="venue-edit-telephone"
            type="text"
            inputmode="tel"
            autocomplete="off"
          />
        </div>
        <div class="form-grid__full">
          <label for="venue-edit-website">Website <span class="text-gray-400 font-normal">(optional)</span></label>
          <UInput
            id="venue-edit-website"
            v-model="venue.website"
            name="venue-edit-website"
            type="text"
            inputmode="url"
            autocomplete="off"
            placeholder="https://example.com"
          />
        </div>
        <div class="form-grid__full">
          <label for="venue-edit-photo">Photo path / URL</label>
          <UInput
            id="venue-edit-photo"
            v-model="venue.photo"
            name="venue-edit-photo"
            autocomplete="off"
            placeholder="e.g. public/1234567890 or images/venues/..."
          />
          <p class="text-xs text-gray-500 mt-1">Use the photo upload button on the venues list to upload a file, or paste a path here.</p>
        </div>
        <div>
          <label for="venue-edit-local-authority">Local authority</label>
          <UInput
            id="venue-edit-local-authority"
            v-model="venue.local_authority"
            name="venue-edit-local-authority"
            autocomplete="off"
          />
        </div>
        <div>
          <label for="venue-edit-is-live">Live listing</label>
          <USelect
            id="venue-edit-is-live"
            v-model="venue.is_live"
            :options="liveOptions"
            name="venue-edit-is-live"
          />
        </div>
        <div>
          <label for="venue-edit-latitude">Latitude</label>
          <UInput
            id="venue-edit-latitude"
            v-model="venue.latitude"
            name="venue-edit-latitude"
            autocomplete="off"
          />
        </div>
        <div>
          <label for="venue-edit-longitude">Longitude</label>
          <UInput
            id="venue-edit-longitude"
            v-model="venue.longitude"
            name="venue-edit-longitude"
            autocomplete="off"
          />
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
        venue.value.address2 = venueDetails.address2 ?? ''
        venue.value.telephone = venueDetails.telephone ?? ''
        venue.value.website = venueDetails.website ?? ''
        venue.value.photo = venueDetails.photo ?? ''
        venue.value.local_authority = venueDetails.local_authority ?? ''
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
  const trim = (value: unknown) => String(value ?? '').trim()

  return {
    venuename: trim(venue.value.venuename),
    slug: trim(venue.value.slug) || generateSlug(trim(venue.value.venuename)),
    venuetype: trim(venue.value.venuetype) || 'pub',
    address: trim(venue.value.address),
    address2: trim(venue.value.address2),
    town: trim(venue.value.town),
    county: trim(venue.value.county),
    postcode: trim(venue.value.postcode),
    telephone: trim(venue.value.telephone),
    website: trim(venue.value.website),
    photo: trim(venue.value.photo),
    local_authority: trim(venue.value.local_authority),
    latitude: trim(venue.value.latitude),
    longitude: trim(venue.value.longitude),
    is_live: trim(venue.value.is_live) || '1',
    updated_at: now,
    ...(props.editing ? {} : { created_at: now }),
  }
}

const submitVenue = async () => {
  const name = venue.value.venuename?.trim()
  if (!name) {
    return
  }

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

.hidden {
  display: none;
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
