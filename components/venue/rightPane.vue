<template>
  <div>
    <h2 class="text-2xl font-bold">{{ venue.venuename }}</h2>
    <div>Venue ID: {{venue.id}}</div>
    <div>{{ venue.address }}</div>
    <div>{{ venue.town }}</div>
    <div>{{ venue.county }}</div>
    <div>{{ venue.postcode }}</div>
    <div class="mb-4">
      <h3>Notes</h3>
      <ul>
        <li v-for="note in noteStore.notes" :key="note.id">
          {{ note.text }}
        </li>
      </ul>
    </div>
    <UFormGroup name="textarea" label="Tell us something about this venue">
      <UTextarea v-model="state.textarea" />
    </UFormGroup>
    <UButton type="submit" class="mt-2" :disabled="isTextareaBlank" @click="addNote(venue.id)">
      Add
    </UButton>
    <UButton icon="i-heroicons-plus-circle" label="Add" @click="openAddEventModal(venue.id)" />
    <div class="pb-4">
      <UTabs :items="items" :default-index="0" class="mt-4" />
    </div>
    <UModal v-model="isAddEventOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEventOpen = false" />
        </div>
        <event-addEvent :editing="editMode" :venueid="venue.id" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/store/auth.js";
import { useVenueStore } from "@/store/venue.js";
import { useNoteStore } from "@/store/note.js";
const authStore = useAuthStore();
const venueStore = useVenueStore();
const noteStore = useNoteStore();
const props = defineProps({
  fsa_id: Number,
})
const state = reactive({
  textarea: "",
})
const newID = ref("");
const user = ref("");
const isAddEventOpen = ref(false)
const venue = ref({
  venuename: '',
  slug: '',
  venuetype: '',
  address: '',
  town: '',
  county: '',
  postcode: '',
  photo: null, // Initialize photo property as null
  created_at: '',
  updated_at: ''
});
const venueNotes = ref([]);
const items = [{
  label: 'Details',
  content: "venue.venuename"
}, {
  label: 'Pubs Nearby',
  content: 'And, this is the content for Tab2'
}]
// Fetch venue details if in edit mode
onMounted( async() => {
  if (props.fsa_id > 0) {
    console.log("FSA: ", props.fsa_id);
    try {
      const venueDetails = await venueStore.fetchVenueFSADetails(props.fsa_id.toString());
      console.log("venueDetails: ", venueDetails);
      if (venueDetails) {
        venue.value = venueDetails[0];
        console.log("venueDetails: ", venueDetails[0].id);
        // await getVenueNotes(venueDetails.id);
        await noteStore.getVenueNotes(venueDetails[0].id);
      } else {
        console.error("Failed to fetch venue details: Venue details are null or undefined.");
      }
    } catch (error) {
      console.error("Error fetching venue details:", error);
    }
  }
});
const openAddEventModal = (venue) => {
  console.log("clicked: ", venue);
  isAddEventOpen.value = true
}
const isTextareaBlank = computed(() => {
  return state.textarea.trim() === '';
});
const addNote = async (venueid: any) => {
  if (state.textarea.length > 0) {
    try {
      const userId = user.value.id; // Get the user ID from authentication context or store
      const venueId = venueid; // Get the venue ID from component state or props

      await noteStore.addVenueNote(userId, venueId, state.textarea);
      // If venue ID is not available in component state, make sure it's passed as a prop
    } catch (error) {
      console.log("Error in text area: ", error);
      return;
    }
  }
};
</script>

<style scoped>

</style>