<template>
  <div class="venue-map my-8">
    <h2 class="text-3xl font-bold mb-4">Location</h2>
    <ClientOnly>
      <div v-if="hasCoords">
        <div v-if="!hasMapboxToken" class="venue-map__canvas flex items-center justify-center bg-gray-100 text-gray-600 px-4 text-center">
          Map is not configured. Add <code class="text-sm">NUXT_PUBLIC_MAPBOX_TOKEN</code> in your hosting environment variables.
        </div>
        <div v-else ref="mapEl" class="venue-map__canvas" />
        <p class="mt-3">
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
const props = defineProps({
  venue: {
    type: Object,
    required: true,
  },
})

const config = useRuntimeConfig()
const mapboxToken = useMapboxToken()
const mapEl = ref(null)
let mapInstance = null

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

async function initMapbox() {
  if (!hasMapboxToken.value || !hasCoords.value || !mapEl.value) return

  const mapboxgl = (await import('mapbox-gl')).default
  mapboxgl.accessToken = mapboxToken.value

  if (mapInstance) {
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
    const marker = new mapboxgl.Marker()
      .setLngLat([lng.value, lat.value])
      .addTo(mapInstance)

    const addressLine = [props.venue.address, props.venue.town, props.venue.county, props.venue.postcode]
      .filter((p) => p && p !== 'NULL')
      .join(', ')
    const popupHtml = `<div class="venue-map-popup__inner"><strong>${props.venue.venuename}</strong>${addressLine ? `<br>${addressLine}` : ''}</div>`

    marker.setPopup(
      new mapboxgl.Popup({ offset: 24, className: 'venue-map-popup' }).setHTML(popupHtml),
    )
  })
}

onMounted(async () => {
  await nextTick()
  await initMapbox()
})

onBeforeUnmount(() => {
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
</script>

<style scoped>
.venue-map__canvas {
  width: 100%;
  height: 400px;
  min-height: 400px;
  border-radius: 0.25rem;
  overflow: hidden;
}
</style>

<!-- Mapbox popups are mounted on document.body; scoped styles do not reach them -->
<style>
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
</style>
