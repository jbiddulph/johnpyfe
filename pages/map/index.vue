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
import { ref, reactive, onMounted, watch, computed } from 'vue'
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
let mapboxgl: typeof import('mapbox-gl').default | null = null
let popup: InstanceType<typeof import('mapbox-gl').default.Popup> | null = null
let popupTimeout: ReturnType<typeof setTimeout> | null = null
const layersAdded = ref<string[]>([])

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
    await Promise.all([venueStore.fetchTowns(), venueStore.fetchNames(order)])

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

  layersAdded.value.forEach((id) => {
    if (map.value.getLayer(id)) {
      map.value.setLayoutProperty(id, 'visibility', 'none')
    }
  })

  if (map.value.getLayer(layerId)) {
    map.value.setLayoutProperty(layerId, 'visibility', 'visible')
    layersAdded.value.push(layerId)
  }

  map.value.off('mouseenter', layerId)
  map.value.off('mouseleave', layerId)
  map.value.off('click', layerId)

  map.value.on('mouseenter', layerId, (e: { features: any[] }) => {
    if (!mapboxgl) return
    const feature = e.features[0]
    const coordinates = feature.geometry.coordinates.slice()
    popup = new mapboxgl.Popup({ closeButton: false })
      .setLngLat(coordinates)
      .setHTML(
        `<div class='p-2'><h1 class='mb-4 text-2xl'>${feature.properties.venuename}</h1> <h2>${feature.properties.address}, ${feature.properties.address2}</h2></div>`,
      )
      .addTo(map.value)
  })

  map.value.on('mouseleave', layerId, () => {
    popupTimeout = setTimeout(() => {
      popup?.remove()
      popup = null
    }, 1000)
  })

  map.value.on('click', layerId, (e: { features: { properties: { fsa_id: unknown } }[] }) => {
    popup?.remove()
    popup = null
    isOpenRight.slideover = true
    isOpenRight.featureId = e.features[0].properties.fsa_id as string | number
  })
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
