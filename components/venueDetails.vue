<template>
  <div class="modal-content">
    Edit mode: {{ editing }}
    <div id="map"></div>
  </div>
</template>

<script setup lang="ts">
import mapboxgl from 'mapbox-gl';
const props = defineProps({
  content: Object, // Define a prop named 'greeting' of type String
  editing: Boolean
})
const accessToken = ref('');
const map = ref(null);
const marker = ref(null);
const popup = ref(null);
onMounted(() => {
  createMap();
});
function createMap() {
  mapboxgl.accessToken = useRuntimeConfig().public.mapbox_token;

  map.value = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [props.content.longitude, props.content.latitude],
    zoom: 12
  });

  // Add marker at the specified coordinates
  marker.value = new mapboxgl.Marker()
    .setLngLat([props.content.longitude, props.content.latitude])
    .addTo(map.value);

  // Remove crosshair
  const crosshairElement = document.querySelector('.crosshair');
  if (crosshairElement) {
    crosshairElement.remove();
  }

  // Add popup to the marker
  popup.value = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  }).setHTML(`<h3 class="text-3xl">${props.content.venuename}</h3><p>${props.content.address}, ${props.content.town}, ${props.content.county}, ${props.content.postcode}</p>`);

  marker.value.setPopup(popup.value);
}
</script>

<style scoped>
.modal-content {
  min-height: 600px; /* Example max height for scrollbar */
  overflow-y: auto; /* Enable vertical scrollbar if content exceeds max height */
  padding: 20px; /* Example padding */
}
</style>