<template>
  <div>
    <h2>Map</h2>
    <div id="map"></div>
    <!-- <MapboxMap
      map-id="clqv48a3g00y401qu9g8y8pjd"
      style="position: absolute; top: 66px; bottom: 0; left: 0px; width: 100%;"
      :options="{
        //style: 'mapbox://styles/mapbox/light-v11', // style URL
        style: 'mapbox://styles/jbiddulph/clqv48a3g00y401qu9g8y8pjd',
        center: [-68.137343, 45.137451], // starting position
        zoom: 5 // starting zoom
      }"
    /> -->
  </div>
</template>

<script setup lang="ts">
import mapboxgl from 'mapbox-gl';
const accessToken = ref("");
const map = ref(null);
const drawer = ref(false);
const venue = reactive({});
const selectedVenue = ref(null);
onMounted(() => {
  createMap();
  addMarkers();
});
const addMarkers = () => {

}
const createMap = () => {
  accessToken.value = "pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA";
  mapboxgl.accessToken = accessToken.value;
  map.value = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/jbiddulph/clqv48a3g00y401qu9g8y8pjd",
    zoom: 10,
    center: [-0.3801088, 50.8138122],
  });

  map.value.on("click", e => {
    const result = map.value.queryRenderedFeatures(e.point, { layers: ['pubs1'] })
    if (result.length) {
      const popup = new mapboxgl.Popup({ closeButton: false });
      console.log("result: ", result[0]);
      console.log("lngLat: ", e.lngLat);
      const venueid = result[0].properties.id;
      const venuename = result[0].properties.venuename;
      const slug = result[0].properties.slug;
      const address = result[0].properties.address + ', ' + result[0].properties.address2;
      const town = result[0].properties.town;
      const county = result[0].properties.county;
      const postcode = result[0].properties.postcode;
      const type = result[0].properties.venuetype;
      const email = result[0].properties.email;
      const photo = result[0].properties.photo;
      const website = result[0].properties.website;
      const easting = result[0].properties.easting;
      const northing = result[0].properties.northing;
      const added = result[0].properties.created_at;
      const updated = result[0].properties.updated_at;
      const latitude = result[0].properties;
      const longitude = result[0].properties.longitude;
      const lngLat = e.lngLat;
      popup.setLngLat(e.lngLat)
        .setHTML(`<h1 class='mb-4'>${venuename}</h1> <h2>${address}</h2>`)
        .addTo(map.value);
      const { id } = result[0].properties;
      venue[id] = { venueid, venuename, slug, address, town, county, postcode, type, email, photo, website, easting, northing, added, updated, longitude, latitude, lngLat };
      selectedVenue.value = venue[id];
      console.log("selected venue: ", selectedVenue);
    }
  })
}
</script>

<style scoped>
@import "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";

.bg-surface-variant {
  margin: 0 auto;
  margin-top: 20%;
}

#map {
  width: 100%;
  height: 100vh;
}
</style>