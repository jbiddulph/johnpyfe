<template>
  <div>
    <div class="relative">
      <img
        :src="`/assets/images/headers/${route.params.town}.jpg`"
        :alt="townName"
        :title="townName"
        class="w-full h-auto object-cover" />
      <h1 class="text-6xl md:text-8xl absolute inset-0 flex items-center justify-center text-white">{{ townName }}</h1>
    </div>
    <div class="container mx-auto">
      
      <ul>
        <li v-for="event in events" :key="event.id">{{ event.name }}</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
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