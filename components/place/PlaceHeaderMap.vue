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
import { slugifyPlace } from '@/utils/format-venue'

const UK_BOUNDS = [
  [-8.65, 49.86],
  [1.76, 60.86],
]

const props = defineProps({
  placeName: {
    type: String,
    required: true,
  },
  venues: {
    type: Array,
    default: () => [],
  },
  /** 'bounds' fits venue coords; 'uk' shows the whole UK. */
  fitMode: {
    type: String,
    default: 'bounds',
  },
  /** When set, dims other venues and highlights this county on the map. */
  highlightCountySlug: {
    type: String,
    default: null,
  },
})

const SOURCE_ID = 'place-venues'
const HIGHLIGHT_SOURCE_ID = 'place-venues-highlight'
const LAYER_CLUSTERS = 'place-venue-clusters'
const LAYER_CLUSTER_COUNT = 'place-venue-cluster-count'
const LAYER_UNCLUSTERED = 'place-venue-unclustered'
const LAYER_HIGHLIGHT = 'place-venue-highlight'

const mapboxToken = useMapboxToken()
const mapEl = ref(null)
let mapInstance = null
let mapboxglModule = null
let venuePopup = null
let clusterLayersReady = false
let highlightLayerReady = false
let mapHandlersBound = false
let highlightHandlersBound = false
let hasAppliedInitialFit = false

function parseCoord(value) {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

function venueCountySlug(venue) {
  return venue.countySlug || (venue.county ? slugifyPlace(venue.county) : '')
}

function venuesWithCoords() {
  return (props.venues || [])
    .map((v) => {
      const lat = parseCoord(v.latitude)
      const lng = parseCoord(v.longitude)
      if (lat == null || lng == null) return null
      return { ...v, lat, lng, countySlug: venueCountySlug(v) }
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
        countySlug: venue.countySlug || '',
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

function removeHighlightLayer() {
  if (!mapInstance) return
  if (mapInstance.getLayer(LAYER_HIGHLIGHT)) {
    mapInstance.removeLayer(LAYER_HIGHLIGHT)
  }
  if (mapInstance.getSource(HIGHLIGHT_SOURCE_ID)) {
    mapInstance.removeSource(HIGHLIGHT_SOURCE_ID)
  }
  highlightLayerReady = false
}

function removeClusterLayers() {
  if (!mapInstance) return
  removeHighlightLayer()
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

function fitMapToVenues(mapboxgl, plotted, force = false) {
  if (!mapInstance) return

  if (props.fitMode === 'uk') {
    if (!hasAppliedInitialFit || force) {
      mapInstance.fitBounds(UK_BOUNDS, { padding: 32, maxZoom: 5.5 })
      hasAppliedInitialFit = true
    }
    return
  }

  if (!plotted.length) return

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

function showVenuePopup(map, mapboxgl, feature) {
  const coords = feature.geometry.coordinates.slice()
  const { href, name } = feature.properties
  const safeName = escapeHtml(name)
  const popupHtml = `<div class="place-map-popup__inner"><a href="${href}" class="place-map-popup__link"><strong>${safeName}</strong></a></div>`

  removeVenuePopup()
  venuePopup = new mapboxgl.Popup({ offset: 12, className: 'place-map-popup' })
    .setLngLat(coords)
    .setHTML(popupHtml)
    .addTo(map)
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
    if (feature) showVenuePopup(map, mapboxgl, feature)
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

  const clusterRadius = props.fitMode === 'uk' ? 56 : 48

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius,
  })

  map.addLayer({
    id: LAYER_CLUSTERS,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#2563eb',
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
      'circle-opacity': 1,
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
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
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
      'circle-color': '#2563eb',
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 1,
    },
  })

  bindClusterHandlers(map, mapboxglModule)
  clusterLayersReady = true
}

function ensureHighlightLayer(map) {
  if (highlightLayerReady) return

  map.addSource(HIGHLIGHT_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  map.addLayer({
    id: LAYER_HIGHLIGHT,
    type: 'circle',
    source: HIGHLIGHT_SOURCE_ID,
    paint: {
      'circle-color': '#2563eb',
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        6,
        10,
        9,
        14,
        11,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.95,
    },
    layout: {
      visibility: 'none',
    },
  })

  if (!highlightHandlersBound && mapboxglModule) {
    highlightHandlersBound = true
    map.on('click', LAYER_HIGHLIGHT, (e) => {
      const feature = e.features?.[0]
      if (feature) showVenuePopup(map, mapboxglModule, feature)
    })
    map.on('mouseenter', LAYER_HIGHLIGHT, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', LAYER_HIGHLIGHT, () => {
      map.getCanvas().style.cursor = ''
    })
  }

  highlightLayerReady = true
}

function updateCountyHighlight() {
  if (!mapInstance || !clusterLayersReady) return

  ensureHighlightLayer(mapInstance)

  const slug = props.highlightCountySlug
  const plotted = venuesWithCoords()
  const highlighted = slug ? plotted.filter((v) => v.countySlug === slug) : []

  mapInstance.getSource(HIGHLIGHT_SOURCE_ID)?.setData(buildVenueGeoJson(highlighted))

  // Only dim the base layers when highlighted venues are shown on a separate layer.
  const dimmed = Boolean(slug && highlighted.length > 0)
  const baseOpacity = dimmed ? 0.35 : 1
  mapInstance.setPaintProperty(LAYER_CLUSTERS, 'circle-opacity', baseOpacity)
  mapInstance.setPaintProperty(LAYER_UNCLUSTERED, 'circle-opacity', baseOpacity)
  mapInstance.setPaintProperty(LAYER_CLUSTER_COUNT, 'text-opacity', dimmed ? 0.5 : 1)

  mapInstance.setLayoutProperty(
    LAYER_HIGHLIGHT,
    'visibility',
    highlighted.length ? 'visible' : 'none',
  )
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
    fitMapToVenues(mapboxglModule, plotted, plotted.length > 0)
    updateCountyHighlight()
  }

  if (mapInstance.isStyleLoaded()) {
    applyData()
  } else {
    mapInstance.once('load', applyData)
  }
}

async function initMap() {
  if (!mapboxToken.value || !mapEl.value) return

  await loadMapboxStyles()

  const mapboxgl = (await import('mapbox-gl')).default
  mapboxgl.accessToken = mapboxToken.value
  mapboxglModule = mapboxgl

  if (mapInstance) {
    removeVenuePopup()
    removeClusterLayers()
    mapInstance.remove()
    mapInstance = null
    mapHandlersBound = false
    highlightHandlersBound = false
    hasAppliedInitialFit = false
  }

  const plotted = venuesWithCoords()
  const defaultCenter = props.fitMode === 'uk' ? [-2.5, 54.5] : [-1.5, 53.0]
  const center = plotted.length && props.fitMode !== 'uk'
    ? [plotted[0].lng, plotted[0].lat]
    : defaultCenter

  mapInstance = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v11',
    center,
    zoom: props.fitMode === 'uk' ? 5 : plotted.length ? 11 : 10,
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
  scheduleMapInit()
})

function scheduleMapInit() {
  if (!mapEl.value) return
  whenVisible(mapEl.value, () => {
    initMap()
  })
}

watch(mapEl, (el) => {
  if (el) scheduleMapInit()
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
    } else if (mapEl.value && mapboxToken.value) {
      await initMap()
    }
  },
  { deep: true },
)

watch(
  () => props.venues?.length ?? 0,
  async (count) => {
    if (count > 0 && mapInstance) {
      await nextTick()
      updateVenueClusters()
    }
  },
)

watch(
  () => props.highlightCountySlug,
  () => {
    updateCountyHighlight()
  },
)

onBeforeUnmount(() => {
  removeVenuePopup()
  removeClusterLayers()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
  mapHandlersBound = false
  highlightHandlersBound = false
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
  color: #2563eb !important;
  font-weight: 600;
  text-decoration: none;
}

.place-map-popup .place-map-popup__link:hover {
  text-decoration: underline;
}
</style>
