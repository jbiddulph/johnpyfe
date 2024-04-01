// MapStore.ts
import { defineStore } from 'pinia';
import mapboxgl from 'mapbox-gl';
import { ref } from 'vue';

export const useMapStore = defineStore({
  id: 'map',

  state: () => ({
    map: null as mapboxgl.Map | null,
  }),

  actions: {
    initializeMap(mapContainer: HTMLDivElement | null): void {
      if (!mapContainer) return;

      const mapboxToken = useRuntimeConfig().public.mapbox_token;

      // Initialize the Mapbox map
      const map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-0.376854, 50.8143273],
        zoom: 14,
        accessToken: mapboxToken,
      });

      this.map = map;

      // Add the pubs1 data layer
    map.on('load', () => {
      map.addLayer({
        id: 'pubs1',
        type: 'fill',
        source: {
          type: 'vector',
          url: 'mapbox://jbiddulph.uk-pubs1',
        },
        'source-layer': 'pubs1',
        paint: {
          "fill-color": "red",
          'fill-opacity': 0.5,
        },
      });

      // Add markers for each location
      // map.addSource('pubs1-markers', {
      //   type: 'geojson',
      //   data: {
      //     type: 'FeatureCollection',
      //     features: [] // Empty for now, replace with your actual GeoJSON features
      //   }
      // });
    });
    },
  },
});



    

