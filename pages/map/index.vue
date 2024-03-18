<template>
  <div>
    <div class="pt-3 flex justify-evenly w-full text-xl">
      <!-- <div>
        {{ selectedCounty }}
        <USelect v-model="selectedCounty" :options="countyOptions" option-attribute="label" />
      </div> -->
      {{ venueName }}
      
      <input type="text" v-model="searchQuery" @input="searchPlaces" class="capitalize text-center p-2 rounded-t-lg border-t-2 border-l-2 border-r-2 border-white" placeholder="Search UK places...">
      {{ selected }}
      <USelectMenu v-model="selected" :options="districts" multiple placeholder="Select areas" />
    </div>
    <div class="bg-gray-100 border-t">
      <venue-namesList class="h-full" :venuenames="venueStore.names" @venue-name="venueNameSelected" />
    </div>
    <div id="mainmap"></div>
    <USlideover v-model="isOpenRight.slideover" transition="true">
      <div class="p-4 flex-1">
        <venue-rightPane class="h-full" :fsa_id="isOpenRight.featureId" :venuenames="venueStore.names" @venue-name="venueNameSelected" />
      </div>
    </USlideover>
    <UButton label="Open" @click="isOpenLeft.slideover = true" />
    <USlideover v-model="isOpenLeft.slideover" side="left" transition="true">
      <div class="p-4 flex-1">
        <venue-mapFilters class="h-full" :fsa_id="isOpenLeft.featureId" :venuecounties="venueStore.counties" />
      </div>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { useVenueStore } from "@/store/venue.js";
const venueStore = useVenueStore();
import mapboxgl from 'mapbox-gl';
const districts = ['Scotland', 'North West', 'North East', 'Wales', 'East', 'Midlands', 'London', 'South West', 'South East']
const selected = ref([])
const isOpenRight = reactive({
  slideover: false,
  featureId: null
});
const isOpenLeft = reactive({
  slideover: false,
  featureId: null
});
const selectedCounty = ref(null);
const accessToken = ref('');
const searchQuery = ref('');
const venueName = ref('');
const venue = ref({});
const map = ref(null);
let popup: mapboxgl.Popup|null = null;
let popupTimeout: string|number|NodeJS.Timeout|null|undefined = null;
const selectedVenue = ref({});
const layersAdded = ref([]);
onMounted(() => {
  venueName.value = 'VENUES';
  createMap();
});
const countyOptions = computed(() => {
  return venueStore.counties.map((county: { county: any; count: any; }) => ({
    label: `${county.county} (${county.count})`,
    value: county.county
  }));
});
const venueNameSelected = (name: any) => {
  venueName.value = name.toString().toUpperCase();
}
watch(selectedCounty, (newCounty: any) => {
  if (newCounty) {
    flyToCounty(newCounty);
  }
});

async function flyToCounty(countyName: any) {
  const county = venueStore.counties.find((county: { county: any; }) => county.county === countyName);
  if (county) {
    if (!map.value) return; // Ensure map is initialized

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(county.county)}.json?access_token=${accessToken.value}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const coordinates = data.features[0].center;
        if (Array.isArray(coordinates) && coordinates.length === 2) {
          map.value.flyTo({ center: coordinates, zoom: 12 });
        } else {
          console.error('Invalid coordinates received from the API:', coordinates);
        }
      } else {
        console.error('No features found in the API response:', data);
      }
    } catch (error) {
      console.error('Error searching places:', error);
    }
  }
}
const searchPlaces = () => {
  if (!map.value) return; // Ensure map is initialized
  accessToken.value = "pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA";
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.value)}.json?access_token=${accessToken.value}`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.features && data.features.length > 0) {
        const coordinates = data.features[0].center;
        map.value.flyTo({ center: coordinates, zoom: 12 });
      }
    })
    .catch(error => console.error('Error searching places:', error));
}

watch(venueName, (newVenueName, oldVenueName) => {
  if (map && newVenueName !== oldVenueName) {
    updateMapLayer(newVenueName);
  }
});

const createMap = async () => {
  // Previous code remains unchanged
  const order = "-venue_count"
  await venueStore.fetchVenues();
  await venueStore.fetchTowns();
  await venueStore.fetchCounties();
  await venueStore.fetchNames(order);
  accessToken.value = "pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA";
  mapboxgl.accessToken = accessToken.value;
  map.value = new mapboxgl.Map({
    container: "mainmap",
    style: "mapbox://styles/jbiddulph/cltklztvt00b101pj5ddoanuk",
    zoom: 10,
    center: [-3.0665894, 53.9012106],
  });
  map.value.on('load', () => {
    updateMapLayer(venueName.value.toUpperCase());
  });
}

const updateMapLayer = (venueName: any) => {
  isOpenRight.slideover = false;
  // Ensure map is initialized
  if (!map.value) {
    console.error('Map is not initialized.');
    return;
  }

  // Log when the map is initialized
  console.log('Map is initialized.');

  // Ensure venueName is provided
  if (!venueName) {
    console.error('Venue name is not provided.');
    return;
  }

  // Log venueName for debugging
  console.log('Updating layer:', venueName);

  // Hide previously added layers
  layersAdded.value.forEach((layerId: any) => {
    map.value.setLayoutProperty(layerId, 'visibility', 'none');
  });

  // Show the new layer
  map.value.setLayoutProperty(venueName, 'visibility', 'visible');
  // Add the new layer to the layersAdded array
  layersAdded.value.push(venueName);

  // Attach event listener for mouse enter
  map.value.on("mouseenter", venueName, async e => {
    const feature = e.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    if (!popup) {
      // Open a new popup if none exists
      popup = new mapboxgl.Popup({ closeButton: false })
        .setLngLat(coordinates)
        .setHTML(`<div class='bg-gray-200 p-2'><h1 class='mb-4 text-2xl'>${feature.properties.venuename}</h1> <h2>${feature.properties.address}, ${feature.properties.address2}</h2></div>`)
        .addTo(map.value);
    }

    // Clear any existing timeout to close the popup
    clearTimeout(popupTimeout);
  });

  // Attach event listener for mouse leave
  map.value.on("mouseleave", venueName, () => {
    // Set a timeout to close the popup after 1 second
    popupTimeout = setTimeout(() => {
      if (popup) {
        popup.remove();
        popup = null; // Reset the popup reference
      }
    }, 1000);
  });

  map.value.on("click", venueName, async e => {
    console.log("Clicked")
    // Close the popup if another marker is clicked
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