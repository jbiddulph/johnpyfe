import { defineStore } from 'pinia'

export const useMapStore = defineStore({
  id: 'map',

  state: () => ({
    map: null as { remove?: () => void } | null,
  }),

  actions: {
    async initializeMap(mapContainer: HTMLDivElement | null): Promise<void> {
      if (!mapContainer) return

      const mapboxgl = (await import('mapbox-gl')).default
      const mapboxToken = useRuntimeConfig().public.mapbox_token

      const map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-0.376854, 50.8143273],
        zoom: 14,
        accessToken: mapboxToken,
      })

      this.map = map

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
            'fill-color': 'red',
            'fill-opacity': 0.5,
          },
        })
      })
    },
    async initializeSingleMap(mapContainer: HTMLDivElement | null, latLng): Promise<void> {
      if (!mapContainer) return

      const mapboxgl = (await import('mapbox-gl')).default
      const mapboxToken = useRuntimeConfig().public.mapbox_token
      const map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: latLng,
        zoom: 16,
        accessToken: mapboxToken,
      })

      this.map = map

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
            'fill-color': 'red',
            'fill-opacity': 0.5,
          },
        })
      })
    },
  },
})
