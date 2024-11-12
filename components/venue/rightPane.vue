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

    <!-- Custom Tabs -->
    <div class="flex mt-4 space-x-4">
      <button @click="activeTab = 'notes'" :class="{ 'font-bold': activeTab === 'notes' }">Notes</button>
      <button @click="activeTab = 'streetview'" :class="{ 'font-bold': activeTab === 'streetview' }">Google Street View</button>
    </div>

    <!-- Notes Tab Content -->
    <div v-if="activeTab === 'notes'" class="mb-4">
      <h3>Notes</h3>
      <small v-if="noteStore.successMsg" class="text-green-500">{{ noteStore.successMsg }}</small>
      <ul>
        <li v-for="note in noteStore.notes" :key="note.id">{{ note.text }}</li>
      </ul>
      <UFormGroup name="textarea" label="Tell us something about this venue">
        <UTextarea v-model="state.textarea" />
      </UFormGroup>
      <UButton type="submit" class="mt-2" :disabled="isTextareaBlank" @click="addNote">
        Add Note
      </UButton>
    </div>

    <!-- Street View Tab Content -->
    <div v-if="activeTab === 'streetview'" style="width: 100%; height: 400px;">
      <div ref="streetview" style="width: 100%; height: 100%;"></div>
    </div>

    <!-- Modal for Adding Events -->
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useVenueStore } from "@/store/venue.js";
import { useNoteStore } from "@/store/note.js";
const props = defineProps({
  fsa_id: Number,
})
const venueStore = useVenueStore();
const noteStore = useNoteStore();
const state = reactive({ textarea: "" });
const isAddEventOpen = ref(false);
const activeTab = ref("streetview"); // Track the active tab
const streetview = ref(null);

const venue = ref({
  venuename: '',
  id: null,
  address: '',
  town: '',
  county: '',
  postcode: '',
});
const lat = ref(null);
const lng = ref(null);

onMounted(async () => {
  const venueDetails = await venueStore.fetchVenueFSADetails(props.fsa_id.toString());
  venue.value = venueDetails[0];
  lat.value = parseFloat(venueDetails[0].latitude);
  lng.value = parseFloat(venueDetails[0].longitude);

  // Load Google Maps API script
  const googleMapsKey = useRuntimeConfig().public.googleMaps.key;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=maps`;
  script.onload = () => {
    if (activeTab.value === 'streetview' && streetview.value) {
      new google.maps.StreetViewPanorama(streetview.value, {
        position: { lat: lat.value, lng: lng.value },
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
      });
    }
  };
  document.head.appendChild(script);
});

watch(activeTab, (newTab) => {
  if (newTab === "streetview" && window.google && streetview.value) {
    new google.maps.StreetViewPanorama(streetview.value, {
      position: { lat: lat.value, lng: lng.value },
      pov: { heading: 165, pitch: 0 },
      zoom: 1,
    });
  }
});
</script>

<style scoped>
button {
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
}
button.font-bold {
  font-weight: bold;
  border-bottom: 2px solid currentColor;
}
</style>
