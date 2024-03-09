<template>
  <div>
    <div class="pt-3 flex justify-center w-full text-xl">
      <input type="text" v-model="searchQuery" @input="searchPlaces" class="capitalize text-center p-2 rounded-t-lg border-t-2 border-l-2 border-r-2 border-white" placeholder="Search UK places...">
    </div>
    <div id="mainmap"></div>
  </div>
</template>

<script setup lang="ts">
import { useVenueStore } from "@/store/venue.js";
const venueStore = useVenueStore();
import mapboxgl from 'mapbox-gl';
const accessToken = ref('');
const searchQuery = ref('');
const map = ref(null);
// const marker = ref(null);
// const popup = ref(null);
// const drawer = ref(false);
// const venue = reactive({});
const selectedVenue = ref(null);
onMounted( async() => {
  // await venueStore.fetchVenues();
  createMap();
});

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

const createMap = () => {
  accessToken.value = "pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA";
  mapboxgl.accessToken = accessToken.value;
  map.value = new mapboxgl.Map({
    container: "mainmap",
    style: "mapbox://styles/jbiddulph/cltklztvt00b101pj5ddoanuk",
    zoom: 10,
    center: [-0.3801088, 50.8138122],
  });

  // map.value.on("click", e => {
  //   const result = map.value.queryRenderedFeatures(e.point, { layers: ['pubs1'] })
  //   if (result.length) {
  //     const popup = new mapboxgl.Popup({ closeButton: false });
  //     console.log("result: ", result[0]);
  //     console.log("lngLat: ", e.lngLat);
  //     const venueid = result[0].properties.id;
  //     const venuename = result[0].properties.venuename;
  //     const slug = result[0].properties.slug;
  //     const address = result[0].properties.address + ', ' + result[0].properties.address2;
  //     const town = result[0].properties.town;
  //     const county = result[0].properties.county;
  //     const postcode = result[0].properties.postcode;
  //     const type = result[0].properties.venuetype;
  //     const email = result[0].properties.email;
  //     const photo = result[0].properties.photo;
  //     const website = result[0].properties.website;
  //     const easting = result[0].properties.easting;
  //     const northing = result[0].properties.northing;
  //     const added = result[0].properties.created_at;
  //     const updated = result[0].properties.updated_at;
  //     const latitude = result[0].properties;
  //     const longitude = result[0].properties.longitude;
  //     const lngLat = e.lngLat;
  //     popup.setLngLat(e.lngLat)
  //       .setHTML(`<h1 class='mb-4'>${venuename}</h1> <h2>${address}</h2>`)
  //       .addTo(map.value);
  //     const { id } = result[0].properties;
  //     venue[id] = { venueid, venuename, slug, address, town, county, postcode, type, email, photo, website, easting, northing, added, updated, longitude, latitude, lngLat };
  //     selectedVenue.value = venue[id];
  //     console.log("selected venue: ", selectedVenue);
  //   }
  // })
  map.value.on("mouseenter", "pubs1", e => {
    const feature = e.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    
    const popup = new mapboxgl.Popup({ closeButton: false })
      .setLngLat(coordinates)
      .setHTML(`<h1 class='mb-4'>${feature.properties.venuename}</h1> <h2>${feature.properties.address}, ${feature.properties.address2}</h2>`)
      .addTo(map.value);
    
    // Close popup when mouse leaves the feature
    map.value.on("mouseleave", "pubs1", () => {
      popup.remove();
    });
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