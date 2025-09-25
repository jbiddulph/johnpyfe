<template>
  <div>
    <div class="flex justify-space-between">
      <div class="venue">
        <h2 class="text-2xl font-bold">{{ venue.venuename }}</h2>
        <div>Venue ID: {{ venue.id }}</div>
        <div>{{ venue.address }}</div>
        <div>{{ venue.town }}</div>
        <div>{{ venue.county }}</div>
        <div>{{ venue.postcode }}</div>
      </div>
      <div>
        <UButton icon="i-heroicons-plus-circle" size="xs" label="Add Event" @click="openAddEventModal(venue.id)" />
      </div>
    </div>

    <div class="mb-4">
      <div class="flex justify-between flex-row">
        <h3>Notes</h3>
        <small v-if="noteStore.successMsg" class="text-green-500">{{ noteStore.successMsg }}</small>
      </div>
      <ul>
        <li v-for="note in noteStore.notes" :key="note.id">{{ note.text }}</li>
      </ul>
      <UFormGroup name="textarea" label="Tell us something about this venue">
        <UTextarea v-model="state.textarea" />
      </UFormGroup>
      <UButton type="submit" class="mt-2" :disabled="isTextareaBlank" @click="addNote(venue.id)">
        Add Note
      </UButton>
    </div>

    <div v-if="venue.id !== 0">
      <div ref="mapview" id="mapsingle" style="width: 100%; height: 400px;"></div>
    </div>

    <UModal v-model="isAddEventOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEventOpen = false" />
        </div>
        <event-addEvent :editing="editMode" :venueid="venue.id" :venue="venue" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useMapStore } from '@/store/map';
import { useVenueStore } from "@/store/venue.js";
import { useNoteStore } from "@/store/note.js";
const user = useSupabaseUser();
// Fixed Supabase composables
const venueStore = useVenueStore();
const noteStore = useNoteStore();
const mapStore = useMapStore();
const props = defineProps({
  fsa_id: Number,
});

const state = reactive({
  textarea: "",
});

const isAddEventOpen = ref(false);
const venue = ref({
  venuename: '',
  id: null,
  address: '',
  town: '',
  county: '',
  postcode: '',
});

// Fetch venue details if in edit mode
onMounted(async () => {
  if (props.fsa_id > 0) {
    try {
      const venueDetails = await venueStore.fetchVenueFSADetails(props.fsa_id.toString());
      if (venueDetails && venueDetails.length > 0) {
        venue.value = venueDetails[0];
      } else {
        console.error("Failed to fetch venue details.");
      }
    } catch (error) {
      console.error("Error fetching venue details:", error);
    }
  }
  const latLng = [venue.value.longitude,venue.value.latitude]
  const mapContainer = document.getElementById('mapsingle') as HTMLDivElement | null;
      if (mapContainer) {
        mapStore.initializeSingleMap(mapContainer, latLng);
      }
});

const openAddEventModal = (venueId) => {
  isAddEventOpen.value = true;
};

const isTextareaBlank = computed(() => {
  return state.textarea.trim() === '';
});

const addNote = async (venueId) => {
  if (state.textarea.length > 0) {
    try {
      const userId = user.value.id; // Get the user ID from authentication context or store
      await noteStore.addVenueNote(userId.toString(), venueId, state.textarea);
      state.textarea = "";
      await noteStore.getVenueNotes(venueId);
      setTimeout(() => {
        noteStore.successMsg = "";
      }, 4000);
    } catch (error) {
      console.error("Error adding note:", error);
    }
  }
};
</script>

<style scoped>
/* Add any necessary styles here */
</style>