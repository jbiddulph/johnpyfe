<template>
  <div class="venue-location-picker">
    <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
      Drag the map so the marker shows your pub’s location.
    </p>
    <div class="map-shell">
      <div ref="mapContainer" class="map-container" />
      <div class="map-marker" aria-hidden="true" />
    </div>
    <p v-if="displayCoords" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      {{ displayCoords }}
    </p>
  </div>
</template>

<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { loadMapboxStyles, whenVisible } from '@/composables/useMapboxStyles'

const props = defineProps<{
  latitude: string
  longitude: string
}>()

const emit = defineEmits<{
  'update:latitude': [value: string]
  'update:longitude': [value: string]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const mapboxToken = useMapboxToken()
let map: mapboxgl.Map | null = null
let stopVisibleObserver: (() => void) | null = null

const displayCoords = computed(() => {
  const lat = parseCoord(props.latitude)
  const lng = parseCoord(props.longitude)
  if (lat === null || lng === null) return ''
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
})

function parseCoord(value: string): number | null {
  const n = Number.parseFloat(String(value || '').trim())
  return Number.isFinite(n) ? n : null
}

function defaultCenter(): [number, number] {
  const lat = parseCoord(props.latitude) ?? 54.5
  const lng = parseCoord(props.longitude) ?? -2.5
  return [lng, lat]
}

function emitCenter(center: mapboxgl.LngLat) {
  emit('update:latitude', center.lat.toFixed(6))
  emit('update:longitude', center.lng.toFixed(6))
}

function initMap() {
  if (!mapContainer.value || !mapboxToken.value || map) return

  loadMapboxStyles()
  mapboxgl.accessToken = mapboxToken.value

  const hasCoords = parseCoord(props.latitude) !== null && parseCoord(props.longitude) !== null

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: defaultCenter(),
    zoom: hasCoords ? 16 : 6,
  })

  map.addControl(new mapboxgl.NavigationControl(), 'top-right')

  map.on('load', () => {
    emitCenter(map!.getCenter())
  })

  map.on('moveend', () => {
    emitCenter(map!.getCenter())
  })
}

onMounted(() => {
  stopVisibleObserver = whenVisible(mapContainer.value, initMap) ?? null
})

watch(
  () => [props.latitude, props.longitude] as const,
  () => {
    const lat = parseCoord(props.latitude)
    const lng = parseCoord(props.longitude)
    if (!map || lat === null || lng === null) return
    const current = map.getCenter()
    if (Math.abs(current.lat - lat) > 0.00001 || Math.abs(current.lng - lng) > 0.00001) {
      map.jumpTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15) })
    }
  },
)

onBeforeUnmount(() => {
  stopVisibleObserver?.()
  map?.remove()
  map = null
})
</script>

<style scoped>
.map-shell {
  position: relative;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #d1d5db;
}

.map-container {
  height: 320px;
  width: 100%;
}

.map-marker {
  pointer-events: none;
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid #fff;
  background-color: #65a30d;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
</style>
