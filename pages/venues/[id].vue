<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold my-8">
      <NuxtLink to="/venues">
        <span class="text-amber-500">Venues</span>
      </NuxtLink>
      - {{ venue.venuename }}, {{ venue.town }}, {{ venue.county }}
    </h1>
    <div class="flex flex-col md:flex-row">
      <img 
        v-if="venue.photo === 'images/venues/awaiting.jpg'"
        :src="`/assets/images/awaiting.jpg`" 
        alt="Venue image" 
        class="w-full md:w-1/2 h-auto object-cover" 
      />
      <img 
        v-else 
        :src="`${useRuntimeConfig().public.venueImgFolder}${venue.photo}`" 
        alt="Venue image" 
        class="w-full md:w-1/2 h-auto object-cover" 
      />
      <div class="md:ml-8 venue-desc">
        <h2 class="text-3xl">Address</h2>
        <p class="text-2xl">{{ venue?.address }}</p>
        <h2 class="text-3xl mt-4">City / Region</h2>
        <p class="text-2xl">{{ venue?.town }} / {{ venue?.region }} / {{ venue?.postalsearch }}</p>
        <h2 class="text-3xl mt-4">Website</h2>
        <p class="text-2xl"><a :href="venue?.website" target="_blank">{{ venue.website }}</a></p>
      </div>
    </div>
    <div id="singlemap" style="height: 400px;"></div>
    <h2 class="text-4xl font-bold my-8">Events</h2>
    <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <li v-for="(event, index) in eventStore.events" :key="event.id">
        <event-listing 
          :event="event"
          :index="index" 
        />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useEventStore } from "@/store/event.js";
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useVenueStore } from '@/store/venue.js';
import mapboxgl from 'mapbox-gl';

const route = useRoute();
const eventStore = useEventStore();
const venueStore = useVenueStore();
const venue = ref({});
const map = ref(null);
const marker = ref(null);
onMounted(async () => {
  const venueId = route.params.id;
  venue.value = await venueStore.fetchVenueDetails(venueId);
  eventStore.events = await eventStore.fetchVenueEvents(venueId);
  document.title = venue.value.venuename;
  updateMetaKeywords(venue.value);
  createMap();
});
watch(venue, (newVenue) => {
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

function createMap() {
  mapboxgl.accessToken = useRuntimeConfig().public.mapbox_token;

  map.value = new mapboxgl.Map({
    container: 'singlemap',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [venue.value.longitude, venue.value.latitude],
    zoom: 14,
  });

  map.value.on('load', () => {
    // Add marker at the specified coordinates
    marker.value = new mapboxgl.Marker()
      .setLngLat([venue.value.longitude, venue.value.latitude])
      .addTo(map.value);
  });
}
</script>

<style scoped>
.venue-desc p {
  font-weight: 100;
}
#singlemap {
  width: 100%;
  height: 400px!important;
}
</style>