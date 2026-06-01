<template>
  <div class="venue-map my-8">
    <h2 class="text-3xl font-bold mb-4">Location</h2>
    <ClientOnly>
      <div v-if="hasCoords">
        <div v-show="useMapbox" ref="mapEl" class="venue-map__canvas" />
        <iframe
          v-if="!useMapbox"
          class="venue-map__iframe"
          :src="osmEmbedUrl"
          title="Map location"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        />
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
const mapEl = ref(null)
let mapInstance = null

const lat = computed(() => Number(props.venue?.latitude))
const lng = computed(() => Number(props.venue?.longitude))

const hasCoords = computed(() => !Number.isNaN(lat.value) && !Number.isNaN(lng.value))

const mapboxToken = computed(() => String(config.public.mapbox_token || '').trim())

const useMapbox = computed(() => Boolean(mapboxToken.value))

const osmEmbedUrl = computed(() => {
  if (!hasCoords.value) return ''
  const pad = 0.012
  const minLng = lng.value - pad
  const minLat = lat.value - pad
  const maxLng = lng.value + pad
  const maxLat = lat.value + pad
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat.value}%2C${lng.value}`
})

const directionsUrl = computed(() => {
  if (!hasCoords.value) return '#'
  const label = encodeURIComponent(
    [props.venue.venuename, props.venue.address, props.venue.town].filter(Boolean).join(', '),
  )
  return `https://www.google.com/maps/search/?api=1&query=${lat.value},${lng.value}&query_place_id=${label}`
})

async function initMapbox() {
  if (!useMapbox.value || !hasCoords.value || !mapEl.value) return

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
  })

  mapInstance.on('load', () => {
    const marker = new mapboxgl.Marker()
      .setLngLat([lng.value, lat.value])
      .addTo(mapInstance)

    const popupHtml = [
      `<strong>${props.venue.venuename}</strong>`,
      [props.venue.address, props.venue.town, props.venue.county, props.venue.postcode]
        .filter((p) => p && p !== 'NULL')
        .join(', '),
    ].join('<br>')

    marker.setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(popupHtml))
  })
}

onMounted(async () => {
  await nextTick()
  if (useMapbox.value) await initMapbox()
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
    if (useMapbox.value) await initMapbox()
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

.venue-map__iframe {
  width: 100%;
  height: 400px;
  min-height: 400px;
  border: 0;
  border-radius: 0.25rem;
}
</style>
