<template>
  <div class="modal-content">
    <h2 class="text-2xl">{{ content.event_title }}</h2>
    {{ content.id }}
    <h3 class="mt-4">Are you sure you want to delete {{ content.event_title }}?</h3>
    <div class="flex items-center justify-end mt-12">
      {{ content.photo }}
      <UButton label="Cancel" class="mr-2" color="gray" @click="closeModal" />
      <UButton label="Delete" color="red" @click="deleteEvent(content.id, content.photo)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventStore } from "@/store/event.js";
const eventStore = useEventStore();
const supabase = useSupabaseClient();
const props = defineProps({
  content: Object,
})
const emits = defineEmits(['closeModal']);
const closeModal = () => {
  emits('closeModal');
}
const deleteEvent = async (id: any, photo: string | null) => {
  emits('closeModal');
  if (photo) {
    console.log("Photo: ", photo);
    const photoPath = photo.replace(useRuntimeConfig().public.EVENT_IMG_FOLDER, ''); // Get the relative path
    console.log("photoPath: ", photoPath);
    const { error } = await supabase.storage
      .from('event_images') // Use your bucket name
      .remove([photoPath]);

    if (error) {
      console.error('Error deleting photo from Supabase:', error.message);
    } else {
      console.log('Photo deleted successfully from Supabase storage');
    }
  }
  await eventStore.deleteEvent(id); // Pass formData to addVenue function
  // If photo exists, delete it from Supabase storage
    
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