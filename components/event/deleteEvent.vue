<template>
  <div class="modal-content">
    <h2 class="text-2xl">{{ content.event_title }}</h2>
    {{ content.id }}
    <h3 class="mt-4">Are you sure you want to delete {{ content.event_title }}?</h3>
    <div class="flex items-center justify-end mt-12">
      <UButton label="Cancel" class="mr-2" color="gray" @click="closeModal" />
      <UButton label="Delete" color="red" @click="deleteEvent(content.id)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventStore } from "@/store/event.js";
const eventStore = useEventStore();
const props = defineProps({
  content: Object,
})
const emits = defineEmits(['closeModal']);
const closeModal = () => {
  emits('closeModal');
}
const deleteEvent = async (id: any) => {
  emits('closeModal');
  await eventStore.deleteEvent(id); // Pass formData to addVenue function
  await eventStore.fetchAllEvents();
  console.log("Event deleted");
}
</script>

<style scoped>
.modal-content {
  min-height: 220px; /* Example max height for scrollbar */
  overflow-y: auto; /* Enable vertical scrollbar if content exceeds max height */
  padding: 20px; /* Example padding */
}
</style>