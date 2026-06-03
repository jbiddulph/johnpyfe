<template>
  <ClientOnly>
    <div
      v-if="!mapboxToken"
      class="place-header-map place-header-map--placeholder flex items-center justify-center bg-gray-200 text-gray-600 px-4 text-center"
    >
      Map preview unavailable.
    </div>
    <div v-else ref="mapEl" class="place-header-map" />
    <template #fallback>
      <div class="place-header-map bg-gray-200" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>

<script setup>
const props = defineProps({
  placeName: {
    type: String,
    required: true,
  },
  venues: {
    type: Array,
    default: () => [],
  },
})

const SOURCE_ID = 'place-venues'
const LAYER_CLUSTERS = 'place-venue-clusters'
const LAYER_CLUSTER_COUNT = 'place-venue-cluster-count'
const LAYER_UNCLUSTERED = 'place-venue-unclustered'

const mapboxToken = useMapboxToken()
const mapEl = ref(null)
let mapInstance = null
let mapboxglModule = null
let venuePopup = null
let clusterLayersReady = false
let mapHandlersBound = false

function parseCoord(value) {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

function venuesWithCoords() {
  return (props.venues || [])
    .map((v) => {
      const lat = parseCoord(v.latitude)
      const lng = parseCoord(v.longitude)
      if (lat == null || lng == null) return null
      return { ...v, lat, lng }
    })
    .filter(Boolean)
}

function buildVenueGeoJson(plotted) {
  return {
    type: 'FeatureCollection',
    features: plotted.map((venue) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [venue.lng, venue.lat],
      },
      properties: {
        id: String(venue.id),
        slug: String(venue.slug ?? ''),
        name: String(venue.venuename ?? ''),
        href: venuePath(venue.id, venue.slug),
      },
    })),
  }
}

async function geocodePlace(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${query}, UK`)}.json?access_token=${mapboxToken.value}&limit=1`
  const response = await fetch(url)
  const data = await response.json()
  return data.features?.[0]?.center ?? [-1.5, 53.0]
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function removeVenuePopup() {
  venuePopup?.remove()
  venuePopup = null
}

function removeClusterLayers() {
  if (!mapInstance) return
  const layerIds = [LAYER_CLUSTER_COUNT, LAYER_CLUSTERS, LAYER_UNCLUSTERED]
  for (const id of layerIds) {
    if (mapInstance.getLayer(id)) {
      mapInstance.removeLayer(id)
    }
  }
  if (mapInstance.getSource(SOURCE_ID)) {
    mapInstance.removeSource(SOURCE_ID)
  }
  clusterLayersReady = false
}

function fitMapToVenues(mapboxgl, plotted) {
  if (!mapInstance || !plotted.length) return

  if (plotted.length === 1) {
    mapInstance.setCenter([plotted[0].lng, plotted[0].lat])
    mapInstance.setZoom(14)
    return
  }

  const bounds = new mapboxgl.LngLatBounds()
  plotted.forEach((v) => bounds.extend([v.lng, v.lat]))
  mapInstance.fitBounds(bounds, {
    padding: 48,
    maxZoom: plotted.length > 20 ? 10 : 14,
  })
}

function bindClusterHandlers(map, mapboxgl) {
  if (mapHandlersBound) return
  mapHandlersBound = true

  map.on('click', LAYER_CLUSTERS, (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTERS] })
    if (!features.length) return

    const clusterId = features[0].properties?.cluster_id
    const source = map.getSource(SOURCE_ID)
    if (!source || clusterId == null) return

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom,
      })
    })
  })

  map.on('click', LAYER_UNCLUSTERED, (e) => {
    const feature = e.features?.[0]
    if (!feature) return

    const coords = feature.geometry.coordinates.slice()
    const { href, name } = feature.properties
    const safeName = escapeHtml(name)
    const popupHtml = `<div class="place-map-popup__inner"><a href="${href}" class="place-map-popup__link"><strong>${safeName}</strong></a></div>`

    removeVenuePopup()
    venuePopup = new mapboxgl.Popup({ offset: 12, className: 'place-map-popup' })
      .setLngLat(coords)
      .setHTML(popupHtml)
      .addTo(map)
  })

  const setPointer = () => {
    map.getCanvas().style.cursor = 'pointer'
  }
  const clearPointer = () => {
    map.getCanvas().style.cursor = ''
  }

  for (const layerId of [LAYER_CLUSTERS, LAYER_UNCLUSTERED]) {
    map.on('mouseenter', layerId, setPointer)
    map.on('mouseleave', layerId, clearPointer)
  }
}

function ensureClusterLayers(map) {
  if (clusterLayersReady) return

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 48,
  })

  map.addLayer({
    id: LAYER_CLUSTERS,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#d97706',
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        16,
        10,
        20,
        30,
        24,
        100,
        28,
      ],
      'circle-opacity': 0.9,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })

  map.addLayer({
    id: LAYER_CLUSTER_COUNT,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#ffffff',
    },
  })

  map.addLayer({
    id: LAYER_UNCLUSTERED,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#d97706',
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })

  bindClusterHandlers(map, mapboxglModule)
  clusterLayersReady = true
}

function updateVenueClusters() {
  if (!mapInstance || !mapboxglModule) return

  const plotted = venuesWithCoords()
  removeVenuePopup()

  if (!plotted.length) {
    removeClusterLayers()
    return
  }

  const applyData = () => {
    ensureClusterLayers(mapInstance)
    const source = mapInstance.getSource(SOURCE_ID)
    source?.setData(buildVenueGeoJson(plotted))
    fitMapToVenues(mapboxglModule, plotted)
  }

  if (mapInstance.isStyleLoaded()) {
    applyData()
  } else {
    mapInstance.once('load', applyData)
  }
}

async function initMap() {
  if (!mapboxToken.value || !mapEl.value) return

  const mapboxgl = (await import('mapbox-gl')).default
  mapboxgl.accessToken = mapboxToken.value
  mapboxglModule = mapboxgl

  if (mapInstance) {
    removeVenuePopup()
    removeClusterLayers()
    mapInstance.remove()
    mapInstance = null
    mapHandlersBound = false
  }

  const plotted = venuesWithCoords()
  const center = plotted.length
    ? [plotted[0].lng, plotted[0].lat]
    : await geocodePlace(props.placeName)

  mapInstance = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v11',
    center,
    zoom: plotted.length ? 11 : 10,
    accessToken: mapboxToken.value,
  })

  mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right')
  mapInstance.on('load', () => {
    mapInstance?.resize()
    updateVenueClusters()
  })
}

onMounted(async () => {
  await nextTick()
  await initMap()
})

watch(
  () => props.placeName,
  async () => {
    await nextTick()
    await initMap()
  },
)

watch(
  () => props.venues,
  async () => {
    await nextTick()
    if (mapInstance) {
      updateVenueClusters()
    } else {
      await initMap()
    }
  },
  { deep: true },
)

onBeforeUnmount(() => {
  removeVenuePopup()
  removeClusterLayers()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
  mapHandlersBound = false
  mapboxglModule = null
})
</script>

<style scoped>
.place-header-map {
  width: 100%;
  height: 280px;
  min-height: 280px;
}

@media (min-width: 768px) {
  .place-header-map {
    height: 360px;
    min-height: 360px;
  }
}
</style>

<style>
.place-map-popup .mapboxgl-popup-content {
  color: #111827 !important;
  background-color: #ffffff !important;
  padding: 10px 12px;
}

.place-map-popup .place-map-popup__link {
  color: #d97706 !important;
  font-weight: 600;
  text-decoration: none;
}

.place-map-popup .place-map-popup__link:hover {
  text-decoration: underline;
}
</style>
