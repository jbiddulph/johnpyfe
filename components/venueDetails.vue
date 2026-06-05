<template>
  <div class="modal-content d-flex wrap">
    Edit mode: {{ editing }} {{ content.id }}
    <div class="d-flex w-auto">
      <p><strong>Venue:</strong> {{ content.venuename }}</p>
      <p><strong>Venue type:</strong> {{ content.venuetype }}</p>
      <p><strong>address:</strong> {{ content.address }}</p>
      <p><strong>Town:</strong> {{ content.town }}</p>
      <p><strong>County:</strong> {{ content.county }}</p>
      <p><strong>postCode:</strong> {{ content.postcode }}</p>
      <p><strong>Local Authority:</strong> {{ content.local_authority }}</p>
    </div>
    <div id="map" class="d-flex w-auto"></div>
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
    closeOnClick: false,
    className: 'venue-map-popup',
  }).setHTML(
    `<div class="venue-map-popup__inner"><h3 class="text-xl font-semibold">${props.content.venuename}</h3><p>${props.content.address}, ${props.content.town}, ${props.content.county}, ${props.content.postcode}</p></div>`,
  );

  marker.value.setPopup(popup.value);
}
</script>

<style scoped>
.modal-content {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  min-height: 600px; /* Example max height for scrollbar */
  overflow-y: auto; /* Enable vertical scrollbar if content exceeds max height */
  padding: 20px; /* Example padding */
}
#map {
  width: 800px;
}
</style>

<style>
.venue-map-popup.mapboxgl-popup {
  z-index: 1000 !important;
}

.venue-map-popup .mapboxgl-popup-content {
  color: #111827 !important;
  background-color: #ffffff !important;
}

.venue-map-popup .mapboxgl-popup-content .venue-map-popup__inner,
.venue-map-popup .mapboxgl-popup-content .venue-map-popup__inner h3,
.venue-map-popup .mapboxgl-popup-content .venue-map-popup__inner p {
  color: #111827 !important;
}
</style>