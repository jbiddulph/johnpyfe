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
})

const mapboxToken = useMapboxToken()
const mapEl = ref(null)
let mapInstance = null

async function geocodeTown(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${query}, UK`)}.json?access_token=${mapboxToken.value}&limit=1`
  const response = await fetch(url)
  const data = await response.json()
  return data.features?.[0]?.center ?? [-1.5, 53.0]
}

async function initMap() {
  if (!mapboxToken.value || !mapEl.value) return

  const mapboxgl = (await import('mapbox-gl')).default
  mapboxgl.accessToken = mapboxToken.value

  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }

  const center = await geocodeTown(props.townName)

  mapInstance = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v11',
    center,
    zoom: 12,
    accessToken: mapboxToken.value,
  })

  mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right')
  mapInstance.on('load', () => mapInstance?.resize())
}

onMounted(async () => {
  await nextTick()
  await initMap()
})

watch(
  () => props.townName,
  async () => {
    await nextTick()
    await initMap()
  },
)

onBeforeUnmount(() => {
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
