<template>
  <div class="modal-content">
    <h2 class="text-2xl">{{ content.venuename }}</h2>
    {{ content.id }}
    <h3 class="mt-4">Are you sure you want to delete {{ content.venuename }}?</h3>
    <div class="flex items-center justify-end mt-12">
      <UButton label="Cancel" class="mr-2" color="gray" @click="closeModal" />
      <UButton label="Delete" color="red" @click="deleteVenue(content.id)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVenueStore } from "@/store/venue.js";
const venueStore = useVenueStore();
const props = defineProps({
  content: Object,
})
const emits = defineEmits(['closeModal']);
const closeModal = () => {
  emits('closeModal');
}
const deleteVenue = async (id: any) => {
  await venueStore.deleteVenue(id); // Pass formData to addVenue function
  console.log("Venue deleted");
  emits('closeModal');
}
</script>

<style scoped>
.modal-content {
  min-height: 220px; /* Example max height for scrollbar */
  overflow-y: auto; /* Enable vertical scrollbar if content exceeds max height */
  padding: 20px; /* Example padding */
}
</style>