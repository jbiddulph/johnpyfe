<template>
  <ClientOnly>
    <div
      v-if="!mapboxToken"
      class="town-header-map town-header-map--placeholder flex items-center justify-center bg-gray-200 text-gray-600 px-4 text-center"
    >
      Map preview unavailable.
    </div>
    <div v-else ref="mapEl" class="town-header-map" />
    <template #fallback>
      <div class="town-header-map bg-gray-200" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>

<script setup>
const props = defineProps({
  townName: {
    type: String,
    required: true,
  },
  venues: {
    type: Array,
    default: () => [],
  },
})

const mapboxToken = useMapboxToken()
const mapEl = ref(null)
let mapInstance = null
const markers = []

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

async function geocodeTown(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${query}, UK`)}.json?access_token=${mapboxToken.value}&limit=1`
  const response = await fetch(url)
  const data = await response.json()
  return data.features?.[0]?.center ?? [-1.5, 53.0]
}

function clearMarkers() {
  while (markers.length) {
    markers.pop()?.remove()
  }
}

function addVenueMarkers(mapboxgl) {
  clearMarkers()
  const plotted = venuesWithCoords()

  for (const venue of plotted) {
    const href = venuePath(venue.id, venue.slug)
    const popupHtml = `<div class="town-map-popup__inner"><a href="${href}" class="town-map-popup__link"><strong>${venue.venuename}</strong></a></div>`

    const marker = new mapboxgl.Marker({ color: '#d97706' })
      .setLngLat([venue.lng, venue.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 24, className: 'town-map-popup' }).setHTML(popupHtml),
      )
      .addTo(mapInstance)

    const el = marker.getElement()
    el.style.cursor = 'pointer'
    el.setAttribute('title', venue.venuename)
    el.addEventListener('click', () => {
      navigateTo(href)
    })

    markers.push(marker)
  }

  if (plotted.length === 1) {
    mapInstance.setCenter([plotted[0].lng, plotted[0].lat])
    mapInstance.setZoom(14)
  } else if (plotted.length > 1) {
    const bounds = new mapboxgl.LngLatBounds()
    plotted.forEach((v) => bounds.extend([v.lng, v.lat]))
    mapInstance.fitBounds(bounds, { padding: 48, maxZoom: 14 })
  }
}

async function initMap() {
  if (!mapboxToken.value || !mapEl.value) return

  const mapboxgl = (await import('mapbox-gl')).default
  mapboxgl.accessToken = mapboxToken.value

  if (mapInstance) {
    clearMarkers()
    mapInstance.remove()
    mapInstance = null
  }

  const plotted = venuesWithCoords()
  const center = plotted.length
    ? [plotted[0].lng, plotted[0].lat]
    : await geocodeTown(props.townName)

  mapInstance = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v11',
    center,
    zoom: plotted.length ? 13 : 12,
    accessToken: mapboxToken.value,
  })

  mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right')
  mapInstance.on('load', () => {
    mapInstance?.resize()
    addVenueMarkers(mapboxgl)
  })
}

onMounted(async () => {
  await nextTick()
  await initMap()
})

watch(
  () => [props.townName, props.venues],
  async () => {
    await nextTick()
    await initMap()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  clearMarkers()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style scoped>
.town-header-map {
  width: 100%;
  height: 280px;
  min-height: 280px;
}

@media (min-width: 768px) {
  .town-header-map {
    height: 360px;
    min-height: 360px;
  }
}
</style>

<style>
.town-map-popup .mapboxgl-popup-content {
  color: #111827 !important;
  background-color: #ffffff !important;
  padding: 10px 12px;
}

.town-map-popup .town-map-popup__link {
  color: #d97706 !important;
  font-weight: 600;
  text-decoration: none;
}

.town-map-popup .town-map-popup__link:hover {
  text-decoration: underline;
}
</style>
