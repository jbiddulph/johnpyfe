<template>
  <div>
    <div class="flex justify-between w-full text-xl items-center container mx-auto py-3">
      {{ venueName }}
      <USelect
        class="content-center"
        icon="i-heroicons-map-pin-20-solid"
        color="white"
        size="sm"
        :options="cityNames"
        placeholder="Search by city..."
        v-model="selectedCity"
        @change="searchCity(selectedCity)"
      />
    </div>
    <div class="bg-gray-100 border-t">
      <venue-namesList class="h-full" :venuenames="venueStore.names" @venue-name="venueNameSelected" />
    </div>
    <ClientOnly>
      <div v-if="mapError" class="flex items-center justify-center bg-gray-100 text-gray-600 px-4 py-16 text-center">
        {{ mapError }}
      </div>
      <div id="mainmap" />
      <template #fallback>
        <div id="mainmap" class="bg-gray-100" aria-hidden="true" />
      </template>
    </ClientOnly>
    <USlideover v-model="isOpenRight.slideover" :transition="true">
      <div class="p-4 flex-1">
        <UButton label="Events" @click="showVenueEvents" />
        <venue-rightPane class="h-full" :fsa_id="isOpenRight.featureId" :venuenames="venueStore.names" @venue-name="venueNameSelected" />
      </div>
    </USlideover>
    <USlideover v-model="isOpenLeft.slideover" side="left">
      <div class="p-4 flex-1">
        <venue-eventList v-if="venueStore.venue?.id" class="h-full" :venue-id="venueStore.venue.id" @close="isOpenLeft.slideover = false" />
      </div>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useVenueStore } from '@/store/venue.js'
import { useEventStore } from '@/store/event.js'

useSiteSeo({
  title: 'Map of UK pubs and venues',
  description: 'Explore pubs and venues on an interactive map. Find events and listings near you.',
  path: '/map',
})

const venueStore = useVenueStore()
const eventStore = useEventStore()
const mapboxToken = useMapboxToken()

const selectedCity = ref('')
const cityNames = computed(() => eventStore.cities.map((city) => city.name))

const isOpenRight = reactive({
  slideover: false,
  featureId: null as string | number | null,
})

const isOpenLeft = reactive({
  slideover: false,
  featureId: null as string | number | null,
})

const venueName = ref('VENUES')
const map = ref<any>(null)
const mapError = ref('')
const mapVenues = ref<MapVenuePoint[]>([])
let mapboxgl: typeof import('mapbox-gl').default | null = null
let popup: InstanceType<typeof import('mapbox-gl').default.Popup> | null = null
let popupTimeout: ReturnType<typeof setTimeout> | null = null
const hiddenLegacyLayerIds = ref(new Set<string>())

const SOURCE_ID = 'venue-clusters'
const LAYER_CLUSTERS = 'venue-clusters-circle'
const LAYER_CLUSTER_COUNT = 'venue-clusters-count'
const LAYER_UNCLUSTERED = 'venue-unclustered-point'

type MapVenuePoint = {
  id: number
  fsa_id: number
  slug: string
  venuename: string
  address?: string | null
  address2?: string | null
  town?: string | null
  county?: string | null
  latitude: string
  longitude: string
}

onMounted(async () => {
  eventStore.fetchCities()
  await createMap()
})

const venueNameSelected = (name: string) => {
  venueName.value = name.toString().toUpperCase()
  updateMapLayer(venueName.value)
}

const showVenueEvents = () => {
  isOpenLeft.slideover = true
}

const searchCity = (city: string | number | boolean) => {
  if (!map.value || !mapboxToken.value) return
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(String(city))}.json?access_token=${mapboxToken.value}`

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.features?.length > 0) {
        map.value.flyTo({ center: data.features[0].center, zoom: 12 })
      }
    })
    .catch((error) => console.error('Error searching places:', error))
}

async function createMap() {
  if (!mapboxToken.value) {
    mapError.value =
      'Map is not configured. Add NUXT_PUBLIC_MAPBOX_TOKEN in your Netlify environment variables, then redeploy.'
    return
  }

  try {
    const order = '-venue_count'
    const [, , venuePoints] = await Promise.all([
      venueStore.fetchTowns(),
      venueStore.fetchNames(order),
      $fetch<MapVenuePoint[]>('/api/venues/map'),
    ])
    mapVenues.value = venuePoints

    mapboxgl = (await import('mapbox-gl')).default
    mapboxgl.accessToken = mapboxToken.value

    await nextTick()
    const container = document.getElementById('mainmap')
    if (!container) {
      mapError.value = 'Map container not found.'
      return
    }

    map.value = new mapboxgl.Map({
      container: 'mainmap',
      style: 'mapbox://styles/jbiddulph/cltklztvt00b101pj5ddoanuk',
      zoom: 5,
      center: [-3.0665894, 53.3012106],
      accessToken: mapboxToken.value,
    })

    map.value.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

    map.value.on('load', () => {
      map.value.resize()
      ensureClusterLayers()
      bindClusterHandlers()
      updateMapLayer(venueName.value)
    })
  } catch (err) {
    console.error('Failed to create map:', err)
    mapError.value = 'Unable to load the map. Please try again later.'
  }
}

function updateMapLayer(layerId: string) {
  isOpenRight.slideover = false
  if (!map.value) {
    console.error('Map is not initialized.')
    return
  }

  hideLegacyVenueLayers(layerId)

  const source = map.value.getSource(SOURCE_ID)
  source?.setData(buildVenueGeoJson(filteredVenuePoints(layerId)))
}

function hideLegacyVenueLayers(activeLayerId: string) {
  if (!map.value) return

  const legacyLayerIds = new Set([
    'VENUES',
    activeLayerId,
    ...Array.from(hiddenLegacyLayerIds.value),
  ])

  for (const id of legacyLayerIds) {
    if (map.value.getLayer(id)) {
      map.value.setLayoutProperty(id, 'visibility', 'none')
      hiddenLegacyLayerIds.value.add(id)
    }
  }
}

function filteredVenuePoints(layerId: string) {
  const selected = layerId.trim().toUpperCase()
  if (!selected || selected === 'VENUES') return mapVenues.value

  return mapVenues.value.filter((venue) => venue.venuename?.toUpperCase() === selected)
}

function parseCoord(value: string | number | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

function buildVenueGeoJson(venues: MapVenuePoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: venues
      .map((venue) => {
        const lat = parseCoord(venue.latitude)
        const lng = parseCoord(venue.longitude)
        if (lat == null || lng == null) return null

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat],
          },
          properties: {
            id: venue.id,
            fsa_id: venue.fsa_id,
            venuename: venue.venuename,
            address: venue.address || '',
            address2: venue.address2 || '',
            town: venue.town || '',
            county: venue.county || '',
          },
        }
      })
      .filter(Boolean),
  }
}

function ensureClusterLayers() {
  if (!map.value || map.value.getSource(SOURCE_ID)) return

  map.value.addSource(SOURCE_ID, {
    type: 'geojson',
    data: buildVenueGeoJson([]),
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 56,
  })

  map.value.addLayer({
    id: LAYER_CLUSTERS,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#f59e0b',
        25,
        '#d97706',
        100,
        '#b45309',
        500,
        '#92400e',
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        18,
        25,
        23,
        100,
        29,
        500,
        36,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.95,
    },
  })

  map.value.addLayer({
    id: LAYER_CLUSTER_COUNT,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#ffffff',
    },
  })

  map.value.addLayer({
    id: LAYER_UNCLUSTERED,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#d97706',
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        5,
        12,
        7,
        16,
        9,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 1,
    },
  })
}

function bindClusterHandlers() {
  if (!map.value || !mapboxgl) return

  map.value.on('click', LAYER_CLUSTERS, (e: { point: unknown }) => {
    const features = map.value.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTERS] })
    if (!features.length) return

    const clusterId = features[0].properties?.cluster_id
    const source = map.value.getSource(SOURCE_ID)
    if (!source || clusterId == null) return

    source.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
      if (err) return
      map.value.easeTo({
        center: features[0].geometry.coordinates,
        zoom,
      })
    })
  })

  map.value.on('mouseenter', LAYER_UNCLUSTERED, (e: { features: any[] }) => {
    if (popupTimeout) clearTimeout(popupTimeout)
    const feature = e.features[0]
    if (!feature) return

    const coordinates = feature.geometry.coordinates.slice()
    const { venuename, address, address2, town, county } = feature.properties
    const addressParts = [address, address2, town, county].filter(Boolean)

    popup = new mapboxgl.Popup({ closeButton: false })
      .setLngLat(coordinates)
      .setHTML(
        `<div class="p-2"><h1 class="mb-2 text-lg font-semibold">${escapeHtml(venuename)}</h1><div>${escapeHtml(addressParts.join(', '))}</div></div>`,
      )
      .addTo(map.value)
  })

  map.value.on('mouseleave', LAYER_UNCLUSTERED, () => {
    popupTimeout = setTimeout(() => {
      popup?.remove()
      popup = null
    }, 500)
  })

  map.value.on('click', LAYER_UNCLUSTERED, (e: { features: { properties: { fsa_id: unknown } }[] }) => {
    popup?.remove()
    popup = null
    isOpenRight.slideover = true
    isOpenRight.featureId = e.features[0].properties.fsa_id as string | number
  })

  const setPointer = () => {
    map.value.getCanvas().style.cursor = 'pointer'
  }
  const clearPointer = () => {
    map.value.getCanvas().style.cursor = ''
  }

  for (const layerId of [LAYER_CLUSTERS, LAYER_UNCLUSTERED]) {
    map.value.on('mouseenter', layerId, setPointer)
    map.value.on('mouseleave', layerId, clearPointer)
  }
}

function escapeHtml(text: unknown) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

onBeforeUnmount(() => {
  if (popupTimeout) clearTimeout(popupTimeout)
  map.value?.remove()
  map.value = null
})
</script>

<style>
@import 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';

#mainmap {
  width: 100%;
  height: calc(100vh - 12rem);
  min-height: 400px;
}

.mapboxgl-popup-content {
  color: #333333 !important;
}
</style>
