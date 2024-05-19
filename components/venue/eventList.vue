<template>
  <div>
    <h2>Venue Events</h2>
    {{ eventData }}
    <div class="overflow-y-auto h-[550px] flex flex-row flex-wrap justify-center">
      <div v-for="(event, index) in eventData" :key="index" class="pr-2 pb-2">
        {{ event.event_title }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventStore } from "@/store/event.js";
const eventStore = useEventStore();
const eventData = ref([]);
const props = defineProps({
  venueId: Number,
})

onMounted(async () => {
  console.log("Fetching events.....");
  try {
    eventData.value = await eventStore.fetchVenueEvents(props.venueId);
    console.log(eventData); // Access the fetched event data here
  } catch (error) {
    console.error("Error fetching events:", error);
  }
})
</script>

<style scoped>

</style>