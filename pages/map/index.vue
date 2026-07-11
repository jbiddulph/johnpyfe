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
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ selectedVenueDetails?.venuename || selectedVenue?.name || 'Venue events' }}
            </h2>
            <button
              v-if="selectedVenueDetails && !isDesktopViewport"
              type="button"
              class="mt-1 text-sm font-medium text-amber-700 hover:text-amber-800"
              @click="reopenVenueDetails"
            >
              Back to pub details
            </button>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            aria-label="Close events"
            @click="isOpenLeft.slideover = false"
          />
        </div>
        <venue-eventList
          v-if="venueStore.venue?.id"
          :key="venueStore.venue.id"
          class="h-full"
          :venue-id="venueStore.venue.id"
          @close="isOpenLeft.slideover = false"
        />
      </div>
    </USlideover>
    <UModal v-model="isVenueModalOpen">
      <UCard v-if="selectedVenue" :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                {{ selectedVenue.name }}
              </h3>
              <p v-if="selectedVenueDetails?.venuetype" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ selectedVenueDetails.venuetype }}
              </p>
            </div>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="closeVenueModal" />
          </div>
        </template>
        <div class="space-y-5">
          <div v-if="isVenueDetailsLoading" class="text-sm text-gray-500 dark:text-gray-400">
            Loading venue details...
          </div>
          <UAlert
            v-else-if="venueDetailsError"
            color="red"
            variant="soft"
            :description="venueDetailsError"
          />
          <template v-else>
            <div v-if="selectedVenuePhotoUrl" class="overflow-hidden rounded-lg bg-gray-100">
              <img
                :src="selectedVenuePhotoUrl"
                :alt="selectedVenueDetails.venuename || selectedVenue.name"
                class="max-h-64 w-full object-cover"
              >
            </div>
            <p v-if="selectedVenueDetails?.description" class="text-sm leading-6 text-gray-700 dark:text-gray-200">
              {{ selectedVenueDetails.description }}
            </p>
            <div class="grid gap-3 text-sm sm:grid-cols-2">
              <div
                v-for="detail in selectedVenueDetailRows"
                :key="detail.label"
                class="rounded-md border border-gray-200 p-3 dark:border-gray-800"
              >
                <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {{ detail.label }}
                </dt>
                <dd class="mt-1 break-words text-gray-900 dark:text-white">
                  <a
                    v-if="detail.href"
                    :href="detail.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-amber-700 hover:text-amber-800"
                  >
                    {{ detail.value }}
                  </a>
                  <span v-else>{{ detail.value }}</span>
                </dd>
              </div>
            </div>
            <div v-if="selectedVenueFeatureLines.length" class="text-sm text-gray-700 dark:text-gray-200">
              <h4 class="mb-2 font-semibold text-gray-900 dark:text-white">Features</h4>
              <ul class="space-y-1">
                <li v-for="feature in selectedVenueFeatureLines" :key="feature">
                  {{ feature }}
                </li>
              </ul>
            </div>
          </template>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="selectedVenue.id"
              color="amber"
              variant="solid"
              :to="selectedVenueUrl"
              label="View venue"
            />
            <UButton
              color="gray"
              variant="soft"
              label="Events"
              @click="openSelectedVenueEvents"
            />
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useVenueStore } from '@/store/venue.js'
import { useEventStore } from '@/store/event.js'
import { resolveVenueDisplayPhotoUrl } from '@/utils/format-venue'

useSiteSeo({
  title: 'Map of UK pubs and venues',
  description: 'Explore pubs and venues on an interactive map. Find events and listings near you.',
  path: '/map',
})

const venueStore = useVenueStore()
const eventStore = useEventStore()
const mapboxToken = useMapboxToken()
const config = useRuntimeConfig()

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
  fsaId: number
  name: string
  address: string
  lat: number
  lng: number
}

type SelectedMapVenue = MapVenuePoint
type VenueDetails = Record<string, unknown> & {
  id?: number
  fsa_id?: number
  venuename?: string
  slug?: string
  venuetype?: string
  address?: string
  address2?: string
  town?: string
  county?: string
  postcode?: string
  telephone?: string
  website?: string
  local_authority?: string
  features?: string
  description?: string
  photo?: string
  postalsearch?: string
  easting?: string
  northing?: string
  is_live?: string
  created_at?: string
  updated_at?: string
  latitude?: string
  longitude?: string
}

onMounted(async () => {
  desktopMediaQuery = window.matchMedia('(min-width: 768px)')
  updateDesktopViewport()
  desktopMediaQuery.addEventListener('change', updateDesktopViewport)
  void eventStore.fetchCities()
  void loadFilterData()
  await createMap()
})

const venueNameSelected = (name: string) => {
  venueName.value = name.toString().toUpperCase()
  updateMapLayer(venueName.value)
}

const showVenueEvents = () => {
  isOpenLeft.slideover = true
}

const isVenueModalOpen = ref(false)
const selectedVenue = ref<SelectedMapVenue | null>(null)
const selectedVenueDetails = ref<VenueDetails | null>(null)
const isVenueDetailsLoading = ref(false)
const venueDetailsError = ref('')
const isDesktopViewport = ref(true)
const selectedVenueAddressLines = computed(() => {
  const venue = selectedVenueDetails.value || selectedVenue.value
  if (!venue) return []
  return compactAddressLines({
    address: readVenueString(venue, 'address'),
    address2: readVenueString(venue, 'address2'),
    town: readVenueString(venue, 'town'),
    county: readVenueString(venue, 'county'),
    postcode: readVenueString(venue, 'postcode'),
  })
})
const selectedVenueUrl = computed(() => {
  if (!selectedVenue.value?.id) return ''
  const slug = readVenueString(selectedVenueDetails.value, 'slug')
  return slug ? `/venues/${selectedVenue.value.id}/${slug}` : `/venues/${selectedVenue.value.id}`
})
const selectedVenueFeatureLines = computed(() => {
  const features = readVenueString(selectedVenueDetails.value, 'features')
  if (!features) return []
  return features
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
})
const selectedVenuePhotoUrl = computed(() => {
  const photo = readVenueString(selectedVenueDetails.value, 'photo')
  if (!photo) return ''
  return resolveVenueDisplayPhotoUrl(photo, {
    venueImgFolder: config.public.venueImgFolder as string | undefined,
    supabaseUrl: config.public.supabase?.url as string | undefined,
  })
})
const selectedVenueDetailRows = computed(() => {
  const venue = selectedVenueDetails.value
  if (!venue) return []

  const website = readVenueString(venue, 'website')
  const telephone = readVenueString(venue, 'telephone')
  const rows: Array<{ label: string; value: string; href?: string }> = [
    { label: 'Venue name', value: readVenueString(venue, 'venuename') },
    { label: 'Venue type', value: readVenueString(venue, 'venuetype') },
    { label: 'Address', value: selectedVenueAddressLines.value.join(', ') },
    { label: 'Telephone', value: telephone, href: telephoneHref(telephone) },
    { label: 'Website', value: website, href: websiteHref(website) },
    { label: 'Town', value: readVenueString(venue, 'town') },
    { label: 'County', value: readVenueString(venue, 'county') },
    { label: 'Postcode', value: readVenueString(venue, 'postcode') },
    { label: 'Postcode search', value: readVenueString(venue, 'postalsearch') },
    { label: 'Local authority', value: readVenueString(venue, 'local_authority') },
    { label: 'Latitude', value: readVenueString(venue, 'latitude') },
    { label: 'Longitude', value: readVenueString(venue, 'longitude') },
    { label: 'Easting', value: readVenueString(venue, 'easting') },
    { label: 'Northing', value: readVenueString(venue, 'northing') },
    { label: 'Photo', value: readVenueString(venue, 'photo'), href: photoHref(readVenueString(venue, 'photo')) },
    { label: 'Live status', value: readVenueString(venue, 'is_live') },
    { label: 'Venue ID', value: readVenueString(venue, 'id') },
    { label: 'FSA ID', value: readVenueString(venue, 'fsa_id') },
    { label: 'Slug', value: readVenueString(venue, 'slug') },
    { label: 'Created', value: readVenueString(venue, 'created_at') },
    { label: 'Updated', value: readVenueString(venue, 'updated_at') },
  ]

  return rows.filter((row) => row.value)
})

let desktopMediaQuery: MediaQueryList | null = null

function closeVenueModal() {
  isVenueModalOpen.value = false
}

function openSelectedVenueEvents() {
  if (!selectedVenue.value) return
  venueStore.venue = { id: selectedVenue.value.id }
  if (!isDesktopViewport.value) {
    isVenueModalOpen.value = false
  }
  isOpenLeft.slideover = true
}

function reopenVenueDetails() {
  isOpenLeft.slideover = false
  isVenueModalOpen.value = true
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
      void loadVenueClusters()
    })
  } catch (err) {
    console.error('Failed to create map:', err)
    mapError.value = 'Unable to load the map. Please try again later.'
  }
}

async function loadFilterData() {
  try {
    await Promise.all([venueStore.fetchTowns(), venueStore.fetchNames('-venue_count')])
  } catch (err) {
    console.error('Failed to load map filters:', err)
  }
}

async function loadVenueClusters() {
  try {
    mapVenues.value = await $fetch<MapVenuePoint[]>('/api/venues/map')
    updateMapLayer(venueName.value)
  } catch (err) {
    console.error('Failed to load venue clusters:', err)
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

  return mapVenues.value.filter((venue) => venue.name?.toUpperCase() === selected)
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
        const lat = parseCoord(venue.lat)
        const lng = parseCoord(venue.lng)
        if (lat == null || lng == null) return null

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat],
          },
          properties: {
            id: venue.id,
            fsa_id: venue.fsaId,
            venuename: venue.name,
            address: venue.address,
            lat,
            lng,
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
    const { venuename } = feature.properties
    const address = formatAddress(feature.properties)

    popup?.remove()
    popup = new mapboxgl.Popup({ closeButton: false })
      .setLngLat(coordinates)
      .setHTML(
        `<div class="p-2">
          <h1 class="text-lg font-semibold">${escapeHtml(venuename)}</h1>
          ${address ? `<p class="mt-1 text-sm leading-snug">${escapeHtml(address)}</p>` : ''}
        </div>`,
      )
      .addTo(map.value)
  })

  map.value.on('mouseleave', LAYER_UNCLUSTERED, () => {
    popupTimeout = setTimeout(() => {
      popup?.remove()
      popup = null
    }, 500)
  })

  map.value.on('click', LAYER_UNCLUSTERED, (e: { features: { properties: Record<string, unknown> }[] }) => {
    popup?.remove()
    popup = null
    const venue = mapFeatureToVenue(e.features[0]?.properties)
    if (!venue) return
    selectedVenue.value = venue
    selectedVenueDetails.value = null
    venueDetailsError.value = ''
    isVenueModalOpen.value = true
    void loadSelectedVenueDetails(venue.id)
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

function compactAddressLines(venue: {
  address?: string
  address2?: string
  town?: string
  county?: string
  postcode?: string
}) {
  return [
    venue.address,
    venue.address2,
    [venue.town, venue.county].filter(Boolean).join(', '),
    venue.postcode,
  ].filter((line): line is string => Boolean(String(line || '').trim()))
}

function formatAddress(properties: Record<string, unknown>) {
  return String(properties.address || '').trim()
}

function mapFeatureToVenue(properties?: Record<string, unknown>): SelectedMapVenue | null {
  if (!properties) return null
  const lat = parseCoord(properties.lat as string | number | null | undefined)
  const lng = parseCoord(properties.lng as string | number | null | undefined)
  if (lat == null || lng == null) return null

  return {
    id: Number(properties.id || 0),
    fsaId: Number(properties.fsa_id || 0),
    name: String(properties.venuename || ''),
    address: String(properties.address || ''),
    lat,
    lng,
  }
}

async function loadSelectedVenueDetails(id: number) {
  if (!id) return
  isVenueDetailsLoading.value = true
  venueDetailsError.value = ''
  try {
    selectedVenueDetails.value = await venueStore.fetchVenueDetails(id)
  } catch (err) {
    console.error('Failed to load venue details:', err)
    venueDetailsError.value = 'Unable to load full venue details. Please try again.'
  } finally {
    isVenueDetailsLoading.value = false
  }
}

function readVenueString(venue: object | null | undefined, key: string) {
  const value = (venue as Record<string, unknown> | null | undefined)?.[key]
  return value == null ? '' : String(value).trim()
}

function telephoneHref(value: string) {
  const cleaned = value.replace(/[^\d+]/g, '')
  return cleaned ? `tel:${cleaned}` : ''
}

function websiteHref(value: string) {
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function photoHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : ''
}

function updateDesktopViewport() {
  isDesktopViewport.value = desktopMediaQuery?.matches ?? true
}

onBeforeUnmount(() => {
  if (popupTimeout) clearTimeout(popupTimeout)
  desktopMediaQuery?.removeEventListener('change', updateDesktopViewport)
  popup?.remove()
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
