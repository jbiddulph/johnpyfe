<template>
  <div class="venue-map" :class="{ 'my-8': !compact, 'my-4': compact }">
    <h2 v-if="!compact" class="text-3xl font-bold mb-4">Location</h2>
    <ClientOnly>
      <div v-if="hasCoords">
        <div v-if="!hasMapboxToken" class="venue-map__canvas flex items-center justify-center bg-gray-100 text-gray-600 px-4 text-center">
          Map is not configured. Add <code class="text-sm">NUXT_PUBLIC_MAPBOX_TOKEN</code> in your hosting environment variables.
        </div>
        <div v-else ref="mapEl" class="venue-map__canvas" :class="{ 'venue-map__canvas--compact': compact }" />
        <p v-if="showDirections && !compact" class="mt-3">
          <a
            :href="directionsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-amber-600 hover:underline font-medium"
          >
            Get directions
          </a>
        </p>
      </div>
      <p v-else class="text-lg text-gray-600">Location coordinates are not available for this venue.</p>
      <template #fallback>
        <div class="venue-map__canvas bg-gray-100" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import { formatDistanceMiles, parseVenueCoord } from '@/utils/format-venue'

const props = defineProps({
  venue: {
    type: Object,
    required: true,
  },
  /** Other venues within ~1 mile (from /api/venues/:id/nearby). */
  nearbyVenues: {
    type: Array,
    default: () => [],
  },
  compact: {
    type: Boolean,
    default: false,
  },
  showDirections: {
    type: Boolean,
    default: true,
  },
})

const mapboxToken = useMapboxToken()
const mapEl = ref(null)
let mapInstance = null
let mapboxglModule = null
const markerInstances = []
const popupInstances = []

function clearMarkers() {
  for (const m of markerInstances) m.remove()
  markerInstances.length = 0
  popupInstances.length = 0
}

function createPinElement(variant) {
  const el = document.createElement('div')
  el.className = `venue-map-pin venue-map-pin--${variant}`
  el.setAttribute('aria-hidden', 'true')
  return el
}

function nearbyWithCoords() {
  return (props.nearbyVenues || [])
    .map((v) => {
      const lat = parseVenueCoord(v.latitude)
      const lng = parseVenueCoord(v.longitude)
      if (lat == null || lng == null) return null
      return { ...v, lat, lng }
    })
    .filter(Boolean)
}

const lat = computed(() => Number(props.venue?.latitude))
const lng = computed(() => Number(props.venue?.longitude))

const hasCoords = computed(() => !Number.isNaN(lat.value) && !Number.isNaN(lng.value))

const hasMapboxToken = mapboxToken

const directionsUrl = computed(() => {
  if (!hasCoords.value) return '#'
  const label = encodeURIComponent(
    [props.venue.venuename, props.venue.address, props.venue.town].filter(Boolean).join(', '),
  )
  return `https://www.google.com/maps/search/?api=1&query=${lat.value},${lng.value}&query_place_id=${label}`
})

function createPopup(mapboxgl, html, offset) {
  const popup = new mapboxgl.Popup({
    offset,
    className: 'venue-map-popup',
    closeButton: true,
  }).setHTML(html)

  popup.on('open', () => {
    for (const other of popupInstances) {
      if (other !== popup && other.isOpen()) other.remove()
    }
    const el = popup.getElement()
    if (el) {
      el.style.zIndex = '1000'
      const link = el.querySelector('.venue-map-popup__link')
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault()
          const target = link.getAttribute('href')
          if (target) navigateTo(target)
        })
      }
    }
  })

  popupInstances.push(popup)
  return popup
}

function addMarkers(mapboxgl) {
  if (!mapInstance) return
  clearMarkers()

  const near = nearbyWithCoords()

  for (const v of near) {
    const distance = formatDistanceMiles(v.distanceMiles)
    const href = venuePath(v.id, v.slug)
    const popupHtml = `<div class="venue-map-popup__inner"><strong>${escapeHtml(v.venuename)}</strong>${distance ? `<br><span class="venue-map-popup__muted">${escapeHtml(distance)} away</span>` : ''}<br><a href="${escapeHtml(href)}" class="venue-map-popup__link">View venue</a></div>`
    const marker = new mapboxgl.Marker({ element: createPinElement('nearby'), anchor: 'center' })
      .setLngLat([v.lng, v.lat])
      .setPopup(createPopup(mapboxgl, popupHtml, 14))
      .addTo(mapInstance)
    markerInstances.push(marker)
  }

  const addressLine = [props.venue.address, props.venue.town, props.venue.county, props.venue.postcode]
    .filter((p) => p && p !== 'NULL')
    .join(', ')
  const mainPopupHtml = `<div class="venue-map-popup__inner"><strong>${escapeHtml(props.venue.venuename)}</strong>${addressLine ? `<br>${escapeHtml(addressLine)}` : ''}</div>`
  const mainMarker = new mapboxgl.Marker({ element: createPinElement('primary'), anchor: 'center' })
    .setLngLat([lng.value, lat.value])
    .setPopup(createPopup(mapboxgl, mainPopupHtml, 20))
    .addTo(mapInstance)
  markerInstances.push(mainMarker)

  if (near.length > 0) {
    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend([lng.value, lat.value])
    for (const v of near) bounds.extend([v.lng, v.lat])
    mapInstance.fitBounds(bounds, { padding: props.compact ? 40 : 56, maxZoom: 15, duration: 0 })
  } else {
    mapInstance.setCenter([lng.value, lat.value])
    mapInstance.setZoom(14)
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function initMapbox() {
  if (!hasMapboxToken.value || !hasCoords.value || !mapEl.value) return

  await loadMapboxStyles()

  if (!mapboxglModule) {
    mapboxglModule = (await import('mapbox-gl')).default
    mapboxglModule.accessToken = mapboxToken.value
  }
  const mapboxgl = mapboxglModule

  if (mapInstance) {
    clearMarkers()
    mapInstance.remove()
    mapInstance = null
  }

  mapInstance = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [lng.value, lat.value],
    zoom: 14,
    accessToken: mapboxToken.value,
  })

  mapInstance.on('load', () => {
    mapInstance.resize()
    addMarkers(mapboxgl)
  })
}

async function refreshMarkers() {
  if (!mapInstance || !mapboxglModule) return
  if (!mapInstance.loaded()) {
    mapInstance.once('load', () => addMarkers(mapboxglModule))
    return
  }
  addMarkers(mapboxglModule)
}

onMounted(async () => {
  await nextTick()
  scheduleMapInit()
})

function scheduleMapInit() {
  if (!mapEl.value) return
  whenVisible(mapEl.value, () => {
    initMapbox()
  })
}

watch(mapEl, (el) => {
  if (el) scheduleMapInit()
})

onBeforeUnmount(() => {
  clearMarkers()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})

watch(
  () => [props.venue?.latitude, props.venue?.longitude, mapboxToken.value],
  async () => {
    await nextTick()
    await initMapbox()
  },
)

watch(
  () => props.nearbyVenues,
  async () => {
    await nextTick()
    await refreshMarkers()
  },
  { deep: true },
)
</script>

<style scoped>
.venue-map__canvas {
  width: 100%;
  height: 400px;
  min-height: 400px;
  border-radius: 0.25rem;
  overflow: hidden;
}

.venue-map__canvas--compact {
  height: 280px;
  min-height: 280px;
}
</style>

<style>
.venue-map-pin {
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.venue-map-pin--primary {
  width: 32px;
  height: 32px;
  background-color: #ea580c;
}

.venue-map-pin--nearby {
  width: 16px;
  height: 16px;
  background-color: #fdba74;
  border-width: 1.5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
</style>

<!-- Mapbox popups are mounted inside the map container; scoped styles do not reach them -->
<style>
.venue-map__canvas .mapboxgl-marker {
  z-index: 1;
}

.venue-map__canvas .mapboxgl-popup.venue-map-popup {
  z-index: 1000 !important;
}

.venue-map-popup.mapboxgl-popup {
  z-index: 1000 !important;
}

.venue-map-popup .mapboxgl-popup-content {
  color: #111827 !important;
  background-color: #ffffff !important;
  padding: 12px 14px;
  line-height: 1.45;
}

.venue-map-popup .mapboxgl-popup-content .venue-map-popup__inner,
.venue-map-popup .mapboxgl-popup-content .venue-map-popup__inner strong {
  color: #111827 !important;
}

.venue-map-popup .venue-map-popup__muted {
  color: #6b7280 !important;
  font-size: 0.875rem;
}

.venue-map-popup .venue-map-popup__link {
  color: #d97706 !important;
  font-weight: 500;
  text-decoration: underline;
}
</style>
