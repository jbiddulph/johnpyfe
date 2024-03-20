<template>
  <div class="modal-content">
    <h1 class="text-2xl mb-4">Edit Coordinates</h1>
    <form @submit.prevent="submitVenue" enctype="multipart/form-data">
      <div>
        <label for="Name">Latitude</label>
        <UInput v-model="venue.latitude" label="Venue Latitude" name="latitude" required />
      </div>
      <div>
        <label for="Name">Longitude</label>
        <UInput v-model="venue.longitude" label="Venue Longitude" name="longitude" required />
      </div>
      <div id="map"></div>
      <UButton type="submit">Save Changes</UButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import mapboxgl from 'mapbox-gl';
import { useVenueStore } from "@/store/venue.js";

const accessToken = ref('');
const map = ref(null);
const crosshair = ref(null);
const defaultLatitude = 50.8138122;
const defaultLongitude = -0.3801088;
const venue = ref({
  latitude: '',
  longitude: '',
});
const props = defineProps({
  editing: Boolean,
  venueid: Number
});
const emits = defineEmits(['closeModal']);
const venueStore = useVenueStore();

onMounted(() => {
  createMap();
  if (props.editing && props.venueid > 0) {
    fetchVenueDetails();
  }
});

watchEffect(() => {
  updateMapCenter();
});

async function fetchVenueDetails() {
  try {
    const venueDetails = await venueStore.fetchVenueDetails(props.venueid);
    if (venueDetails) {
      venue.value = venueDetails;
    } else {
      console.error("Failed to fetch venue details: Venue details are null or undefined.");
    }
  } catch (error) {
    console.error("Error fetching venue details:", error);
  }
}

const submitVenue = async () => {
  try {
    event.preventDefault();
    const formData = new FormData();
    formData.append('latitude', venue.value.latitude);
    formData.append('longitude', venue.value.longitude);
    
    console.log("FormData:", formData); // Check FormData object before sending
    const venueData = {};
    const formDataEntries = [...formData.entries()];
    for (const [key, value] of formDataEntries) {
      // if (value instanceof File && key === "photo") {
      //   venueData[key] = value;
      // } else {
      // Map the key names to match the structure of the venue object
      switch (key) {
        case 'latitude':
        case 'longitude':
          venueData[key] = value.toString();
          break;
        default:
          break; // Handle other keys as needed
      }
      // }
    }
    if (props.venueid !== null) {
      venueData.id = props.venueid; // Add venueId to the venueData if it's available
      console.log("venue Data: ", venueData);
      await venueStore.editVenue(venueData.id, venueData); // Pass formData to addVenue function
      console.log("Venue edited successfully:", venueData);
      emits('closeModal');
    }

  } catch (error) {
    console.error("Error editing venue:", error);
  }
  return false
};
function createMap() {
  accessToken.value = 'pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA';
  mapboxgl.accessToken = accessToken.value;

  map.value = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [defaultLongitude, defaultLatitude],
    zoom: 16
  });

  crosshair.value = document.createElement('div');
  crosshair.value.className = 'crosshair';
  map.value.getContainer().appendChild(crosshair.value);

  map.value.on('moveend', () => {
    const center = map.value.getCenter();
    console.log('Center Latitude:', center.lat);
    console.log('Center Longitude:', center.lng);
    venue.value.latitude = center.lat;
    venue.value.longitude = center.lng;
  });
}

function updateMapCenter() {
  if (venue.value.latitude && venue.value.longitude) {
    map.value.setCenter([parseFloat(venue.value.longitude), parseFloat(venue.value.latitude)]);
  }
}
</script>

<style>
#map {
  position: relative;
  height: 200px;
}
.modal-content {
  min-height: 600px; /* Example max height for scrollbar */
  overflow-y: auto; /* Enable vertical scrollbar if content exceeds max height */
  padding: 20px; /* Example padding */
}
form div {
  flex-direction: column;
  display: flex;
  margin-bottom: 10px;
}
.crosshair {
  /* width: 20px;
  height: 20px;
  background-image: url('/assets/crosshair.png');
  background-size: cover;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000; */
  width: 50px;
  height: 50px;
  background-image:  url('/assets/crosshair.png'); /* Change the color to verify positioning */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}
</style>