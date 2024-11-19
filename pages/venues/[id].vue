<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold my-8">
      <NuxtLink to="/venues">
        <span class="text-amber-500">Venues</span></NuxtLink>
        - {{ venue.venuename }}, {{ venue.town }}, {{ venue.county }}
    </h1>
    <div class="flex flex-col md:flex-row">
        xx<img 
          v-if="venue.photo === 'images/venues/awaiting.jpg'"
          :src="`/assets/images/awaiting.jpg`" 
          alt="Venue image" 
          class="w-full md:w-1/2 h-auto object-cover" 
        />xx
        yy<img 
          v-else 
          :src="`${useRuntimeConfig().public.venueImgFolder}${venue.photo}`" 
          alt="Venue image" 
          class="w-full md:w-1/2 h-auto object-cover" 
        />yy
      <div class="md:ml-8">
        <p><strong>Description:</strong> {{ venue?.description }}</p>
        <p><strong>Address:</strong> {{ venue?.address }}</p>
        <p><strong>City:</strong> {{ venue?.city?.name }}</p>
        <p><strong>Website:</strong> <a :href="venue?.website" target="_blank">{{ venue.website }}</a></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useVenueStore } from '@/store/venue.js';

const route = useRoute();
const venueStore = useVenueStore();
const venue = ref({});

onMounted(async () => {
  const venueId = route.params.id;
  venue.value = await venueStore.fetchVenueDetails(venueId);
  document.title = venue.value.venuename;
  updateMetaKeywords(venue.value);
});

watch(venue, (newVenue) => {
  console.log(newVenue.venuename);
  document.title = newVenue.venuename + " in " + newVenue.town + ", " + newVenue.county;
  updateMetaKeywords(newVenue);
});

function updateMetaKeywords(venue) {
  const keywords = venue.description || '';
  let metaTag = document.querySelector('meta[name="keywords"]');
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = 'keywords';
    document.head.appendChild(metaTag);
  }
  metaTag.content = keywords;
}
</script>