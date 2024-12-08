<template>
  <div>
    <div class="relative">
      <img
        :src="`/assets/images/headers/${route.params.town}.jpg`"
        :alt="townName"
        :title="townName"
        class="w-full h-auto object-cover" />
      <h1 class="text-6xl md:text-8xl absolute inset-0 flex items-center justify-center text-white drop-shadow-md">{{ townName }}</h1>
    </div>
    <div class="container mx-auto p-4 my-8">
      <h2 class="text-4xl font-bold my-8">Events in {{ townName }}</h2>
      <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(event, index) in events" :key="event.id">
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

const route = useRoute();
const townName = ref('');
const events = ref([]);

onMounted(async () => {
  const townSlug = route.params.town;
  const response = await fetch(`/api/events/town/${townSlug}`);
  const data = await response.json();
  events.value = data.events;
  console.log("data: ", data);
  townName.value = data.cityName || 'Town not found';
});
</script>