<template>
  <div>
    <div class="relative">
      <img
        :src="`/assets/images/headers/${route.params.town}.jpg`"
        :alt="eventStore.selectedTown"
        :title="eventStore.selectedTown"
        class="w-full h-auto object-cover" />
      <h1 class="text-6xl md:text-8xl absolute inset-0 flex items-center justify-center text-white drop-shadow-md">{{ eventStore.selectedTown }}</h1>
    </div>
    <div class="container mx-auto p-4 my-8">
      <h2 class="text-4xl font-bold my-8">Events in {{ eventStore.selectedTown }}</h2>
      <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(event, index) in eventStore.townEvents" :key="event.id">
          <event-listing 
              :event="event"
              :index="index" 
            />
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useEventStore } from "@/store/event.js";
const eventStore = useEventStore();
const route = useRoute();
const events = ref([]);

onMounted(async () => {
  const townSlug = route.params.town;
  try {
    eventStore.fetchTownEvents(townSlug);
  } catch (error) {
    console.error("Error fetching events:", error);
  }
});
</script>