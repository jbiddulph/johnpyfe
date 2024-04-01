<template>
  <div id="map" style="width: 100%; height: 100vh;"></div>
</template>

<script setup lang="ts">
import mapboxgl, { CircleLayer, VectorSource } from 'mapbox-gl';
import { useMapStore } from '@/store/map';

const mapStore = useMapStore();

onMounted(() => {
  const mapContainer = document.getElementById('map') as HTMLDivElement | null;
  if (mapContainer) {
    mapStore.initializeMap(mapContainer);

    // Access map instance from the store
    const map = mapStore.map;

    // Ensure map is initialized
    if (map) {
      // Add zoom and rotation controls
      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      map.on("load", () => {
        // Add the source that holds the selected detections
        const selectedSource: VectorSource = {
          type: "vector",
          url: "mapbox://jbiddulph.uk-pubs1",
        };
        map.addSource("selectedSource", selectedSource);

        // Create a layer to apply to the map
        const businessLayer: CircleLayer = {
          id: "business-detections",
          type: "circle",
          source: "selectedSource",
          "source-layer": "pubs1",
          paint: {
            "circle-color": [
              "step",
              ["get", "is_live"],
              "#FF0000",
              1,
              "#FF0000",
            ],
            "circle-radius": [
              "case",
              ["boolean", ["feature-state", "hovered"], false],
              10,
              ["boolean", ["feature-state", "selected"], false],
              10,
              6,
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff",
          },
        };
        if (selectedSource.url === "mapbox://jbiddulph.uk-pubs1") {
          map.addLayer(businessLayer);
        }
      });
    }
  }
});
</script>

<style scoped>
#map {
  width: 100%;
  height: 100vh;
}
</style>
