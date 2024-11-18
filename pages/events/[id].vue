<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold my-8">{{ event.event_title }}</h1>
    <div class="flex flex-col md:flex-row">
      <img :src="`${useRuntimeConfig().public.eventImgFolder}/${event.photo}`" alt="Event image" class="w-full md:w-1/2 h-auto object-cover" />
      <div class="md:ml-8">
        <p><strong>Description:</strong> {{ event?.description }}</p>
        <p><strong>Cost:</strong> {{ event?.cost }}</p>
        <p><strong>Duration:</strong> {{ event?.duration }} minutes</p>
        <p><strong>Start Time:</strong> {{ event?.event_start }}</p>
        <p><strong>Category:</strong> {{ event?.category?.name }}</p>
        <p><strong>City:</strong> {{ event?.city?.name }}</p>
        <p><strong>Venue:</strong> {{ event?.listing?.venuename }}</p>
        <!-- {{ event?.listing }} -->
        <p><strong>Website:</strong> <a :href="event?.website" target="_blank">{{ event.website }}</a></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEventStore } from '@/store/event.js';

const route = useRoute();
const eventStore = useEventStore();
const event = ref({});

onMounted(async () => {
  const eventId = route.params.id;
  event.value = await eventStore.fetchEventDetails(eventId);
  document.title = event.value.event_title;
  updateMetaKeywords(event.value);
});

watch(event, (newEvent) => {
  console.log(newEvent.event_title);
  document.title = newEvent.event_title;
  updateMetaKeywords(newEvent);
});

function updateMetaKeywords(event) {
  const keywords = event.description || '';
  let metaTag = document.querySelector('meta[name="keywords"]');
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = 'keywords';
    document.head.appendChild(metaTag);
  }
  metaTag.content = keywords;
}
</script>