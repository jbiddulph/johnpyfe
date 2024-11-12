<template>
  <div>
    <div class="flex justify-between w-full text-xl items-center container mx-auto py-3">
      {{ venueName }}
      <USelect
        class="content-center"
        icon="i-heroicons-map-pin-20-solid"
        color="white"
        size="sm"
        :options="cityList"
        placeholder="Search by city..."
        v-model="selectedCity"
        @change="searchCity(selectedCity)"
      />
    </div>
    <div class="bg-gray-100 border-t">
      <venue-namesList class="h-full" :venuenames="venueStore.names" @venue-name="venueNameSelected" />
    </div>
    <div id="mainmap"></div>
    <USlideover v-model="isOpenRight.slideover" :transition="true">
      <div class="p-4 flex-1">
        <UButton label="Events" @click="showVenueEvents" />
        <venue-rightPane class="h-full" :fsa_id="isOpenRight.featureId" :venuenames="venueStore.names" @venue-name="venueNameSelected" />
      </div>
    </USlideover>
    <USlideover v-model="isOpenLeft.slideover" side="left">
      <div class="p-4 flex-1">
        <venue-eventList class="h-full" :venue-id="venueStore.venue[0].id" @close="isOpenLeft.slideover = false" />
      </div>
    </USlideover>
  </div>
</template>


<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useVenueStore } from "@/store/venue.js";
import mapboxgl from 'mapbox-gl';

// State variables
const venueStore = useVenueStore();
const selectedCity = ref("");
const cityList = [
  "Aberdeen", "Bath", "Birmingham", "Bradford",
  "Brighton & Hove", "Bristol", "Cambridge", "Canterbury", "Cardiff", "Carlisle",
  "Chelmsford", "Chester", "Chichester", "Coventry", "Derby", "Dundee",
  "Durham", "Edinburgh", "Exeter", "Glasgow", "Gloucester", "Hereford",
  "Inverness", "Kingston upon Hull", "Lancaster uk", "Leeds", "Leicester",
  "Lichfield", "Lincoln", "Liverpool", "London", "Manchester", "Newcastle upon Tyne", 
  "Newport", "Norwich", "Nottingham",
  "Oxford", "Perth uk", "Peterborough", "Plymouth", "Portsmouth", "Preston", "Ripon",
  "Salford", "Salisbury uk", "Sheffield", "Southampton", "St Albans", "Stirling",
  "Stoke-on-Trent", "Sunderland", "Swansea", "Truro", "Wakefield", "Wells uk",
  "Westminster", "Winchester uk", "Wolverhampton", "Worcester", "York"
];

const isOpenRight = reactive({
  slideover: false,
  featureId: null
});

const isOpenLeft = reactive({
  slideover: false,
  featureId: null
});

const venueName = ref('');
const map = ref(null);
let popup: mapboxgl.Popup|null = null;
let popupTimeout: string|number|NodeJS.Timeout|null|undefined = null;
const layersAdded = ref([]);

onMounted(() => {
  venueName.value = 'VENUES';
  createMap();
});

const venueNameSelected = (name: any) => {
  venueName.value = name.toString().toUpperCase();
}

const showVenueEvents = (venueId: any) => {
  console.log("the venueId: ", venueId);
  isOpenLeft.slideover = true;
}
const searchCity = (city: string|number|boolean) => {

  if (!map.value) return;
  const accessToken = useRuntimeConfig().public.mapbox_token;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${accessToken}`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.features && data.features.length > 0) {
        const coordinates = data.features[0].center;
        map.value.flyTo({ center: coordinates, zoom: 12 });
        searchQuery.value = ""
      }
    })
    .catch(error => console.error('Error searching places:', error));
}

const createMap = async () => {
  const order = "-venue_count";
  await venueStore.fetchTowns();
  // await venueStore.fetchCounties();
  await venueStore.fetchNames(order);
  const accessToken = useRuntimeConfig().public.mapbox_token;
  mapboxgl.accessToken = accessToken;
  map.value = new mapboxgl.Map({
    container: "mainmap",
    style: "mapbox://styles/jbiddulph/cltklztvt00b101pj5ddoanuk",
    zoom: 5,
    center: [-3.0665894, 53.3012106],
  });
  map.value.on('load', () => {
    map.value.once('render', () => {
      updateMapLayer(venueName.value.toUpperCase());
    });
  });
}

const updateMapLayer = (venueName: any) => {
  isOpenRight.slideover = false;
  if (!map.value) {
    console.error('Map is not initialized.');
    return;
  }
  layersAdded.value.forEach((layerId: any) => {
    map.value.setLayoutProperty(layerId, 'visibility', 'none');
  });
  map.value.setLayoutProperty(venueName, 'visibility', 'visible');
  layersAdded.value.push(venueName);

  map.value.on("mouseenter", venueName, async (e: { features: any[]; }) => {
    const feature = e.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    if (!popup) {
      popup = new mapboxgl.Popup({ closeButton: false })
        .setLngLat(coordinates)
        .setHTML(`<div class='bg-gray-200 p-2'><h1 class='mb-4 text-2xl'>${feature.properties.venuename}</h1> <h2>${feature.properties.address}, ${feature.properties.address2}</h2></div>`)
        .addTo(map.value);
    }
  });

  map.value.on("mouseleave", venueName, () => {
    popupTimeout = setTimeout(() => {
      if (popup) {
        popup.remove();
        popup = null;
      }
    }, 1000);
  });

  map.value.on("click", venueName, async (e: { features: { properties: { fsa_id: any; }; }[]; }) => {
    console.log("Clicked");
    if (popup) {
      popup.remove();
      popup = null;
    }
    isOpenRight.value = true;
    isOpenRight.slideover = true;
    isOpenRight.featureId = e.features[0].properties.fsa_id;
  });
}
</script>


<style>
@import "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
.bg-surface-variant {
  margin: 0 auto;
  margin-top: 20%;
}

#mainmap {
  width: 100%;
  height: 100vh!important;
}
.mapboxgl-popup-content {
  color: #333333!important;
}

</style>
