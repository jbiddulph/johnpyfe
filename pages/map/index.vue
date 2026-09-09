<template>
  <div>
    <div class="flex justify-between w-full text-xl items-center container mx-auto py-3 gap-3 flex-wrap">
      <span>{{ venueName }}</span>
      <div class="flex items-center gap-2 flex-wrap">
        <template v-if="isLoggedIn">
          <USelect
            v-if="crawlSelectOptions.length"
            v-model="selectedCrawlId"
            size="sm"
            color="white"
            class="min-w-[12rem]"
            :options="crawlSelectOptions"
            option-attribute="label"
            value-attribute="value"
            placeholder="Select crawl list…"
          />
          <UButton
            size="sm"
            :color="canEditActiveCrawl ? 'blue' : 'sky'"
            variant="soft"
            :icon="canEditActiveCrawl ? 'i-heroicons-map-20-solid' : 'i-heroicons-eye-20-solid'"
            :label="crawlButtonLabel"
            @click="openCrawlBuilder()"
          />
        </template>
        <USelect
          ref="citySelectRef"
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
    </div>
    <div
      v-if="arrivalMessage"
      class="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-center text-sm text-emerald-900"
    >
      {{ arrivalMessage }}
    </div>
    <div class="bg-gray-100 border-t">
      <venue-namesList class="h-full" :venuenames="venueStore.names" @venue-name="venueNameSelected" />
    </div>
    <MapFilterBar
      v-model="filters"
      :types="mapTypes"
      :has-location="Boolean(userLocation)"
      :locating="isLocating"
      :shown="visibleVenueCount"
      :total="mapVenues.length"
      @locate="requestUserLocation"
      @clear="clearFilters"
    />
    <p
      v-if="locationError"
      class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900"
    >
      {{ locationError }}
    </p>
    <ClientOnly>
      <div v-if="mapError" class="flex items-center justify-center bg-gray-100 text-gray-600 px-4 py-16 text-center">
        {{ mapError }}
      </div>
      <div v-else class="relative">
        <div id="mainmap" />
        <MapGettingStarted
          :visible="showGettingStarted"
          :locating="isLocating"
          @dismiss="dismissGettingStarted"
          @locate="requestUserLocation"
          @search-town="focusCitySearch"
        />
        <button
          v-if="!showGettingStarted && isMapZoomedIn"
          type="button"
          class="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow backdrop-blur hover:bg-white dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
          @click="reopenGettingStarted"
        >
          <UIcon name="i-heroicons-information-circle-20-solid" class="h-4 w-4 text-primary-600" />
          How it works
        </button>
        <div
          v-else-if="!showGettingStarted && !isMapZoomedIn"
          class="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-gray-900/80 px-3 py-1.5 text-xs font-medium text-white shadow"
        >
          Zoom in or pick a town to see individual pubs
        </div>
      </div>
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
              class="mt-1 text-sm font-medium text-primary-700 hover:text-primary-800"
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
    <USlideover v-model="isCrawlBuilderOpen" side="left" :ui="{ width: 'w-screen max-w-md' }">
      <MapPubCrawlBuilder
        v-if="isLoggedIn"
        :focus-invite="crawlBuilderFocusInvite"
        @close="isCrawlBuilderOpen = false"
        @crawl-updated="onCrawlUpdated"
      />
    </USlideover>
    <UModal v-model="isVenueModalOpen">
      <UCard v-if="selectedVenue" :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                {{ selectedVenue.name }}
              </h3>
              <p
                v-if="selectedVenueDistanceLabel"
                class="mt-1 inline-flex items-center gap-1 text-sm text-primary-700 dark:text-primary-400"
              >
                <UIcon name="i-heroicons-map-pin-20-solid" class="h-4 w-4" />
                {{ selectedVenueDistanceLabel }}
              </p>
              <button
                v-else-if="!userLocation"
                type="button"
                class="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-700 dark:text-gray-400"
                :disabled="isLocating"
                @click="requestUserLocation"
              >
                <UIcon name="i-heroicons-viewfinder-circle-20-solid" class="h-4 w-4" />
                {{ isLocating ? 'Finding your location…' : 'Share location to see how far away this is' }}
              </button>
            </div>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="closeVenueModal" />
          </div>
        </template>
        <div class="space-y-5">
          <div
            v-if="selectedVenueStaticMapUrl"
            class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <img
              :src="selectedVenueStaticMapUrl"
              :alt="`Map showing ${selectedVenue.name}`"
              class="h-48 w-full object-cover sm:h-56"
              loading="lazy"
            >
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <UButton
              v-if="selectedVenue.id"
              color="primary"
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

          <div
            v-if="isLoggedIn && editableCrawls.length"
            class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
          >
            <label
              :for="modalCrawlSelectId"
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Add to a pub crawl list
            </label>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <USelect
                :id="modalCrawlSelectId"
                v-model="modalCrawlChoice"
                size="sm"
                color="white"
                class="min-w-[12rem] flex-1"
                icon="i-heroicons-list-bullet-20-solid"
                :options="modalCrawlOptions"
                option-attribute="label"
                value-attribute="value"
                :disabled="crawlAddPending || crawlStartPending || crawlSwitching"
              />
              <UButton
                v-if="showCrawlToggleButton"
                :color="selectedVenueOnActiveCrawl ? 'red' : 'blue'"
                variant="soft"
                :icon="selectedVenueOnActiveCrawl ? 'i-heroicons-minus-20-solid' : 'i-heroicons-plus-20-solid'"
                :label="selectedVenueOnActiveCrawl ? 'Remove' : 'Add'"
                :loading="crawlAddPending || crawlSwitching"
                :disabled="crawlStartPending"
                @click="toggleSelectedVenueOnCrawl"
              />
            </div>
            <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              <template v-if="crawlSwitching">Loading list…</template>
              <template v-else-if="!canEditActiveCrawl">Only the crawl creator can add pubs to this list.</template>
              <template v-else-if="selectedVenueOnActiveCrawl">
                {{ selectedVenue.name }} is stop {{ selectedVenueStopNumber }} of {{ stops.length }} on {{ activeCrawl?.name }}.
              </template>
              <template v-else-if="activeCrawl">
                {{ activeCrawl.name }} has {{ stops.length }} {{ stops.length === 1 ? 'stop' : 'stops' }} so far — {{ selectedVenue.name }} would be stop {{ stops.length + 1 }}.
              </template>
            </p>
          </div>

          <div
            v-if="!isLoggedIn || selectedVenueOnActiveCrawl || !editableCrawls.length"
            class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30"
          >
            <div class="flex items-start gap-2">
              <UIcon name="i-heroicons-map-20-solid" class="mt-0.5 h-5 w-5 flex-none text-amber-700 dark:text-amber-400" />
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-amber-900 dark:text-amber-200">
                  {{ selectedVenueOnActiveCrawl ? 'On your crawl — now invite friends' : 'Start a pub crawl from here' }}
                </p>
                <p class="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/90">
                  <template v-if="!isLoggedIn">
                    Log in to make {{ selectedVenue.name }} your first stop, add more pubs and invite others by username.
                  </template>
                  <template v-else-if="selectedVenueOnActiveCrawl">
                    Add more pubs from the map, then invite mates so they can follow the route and chat.
                  </template>
                  <template v-else>
                    Make {{ selectedVenue.name }} stop 1 of a new crawl list, then add more pubs and invite others.
                  </template>
                </p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <UButton
                    v-if="!isLoggedIn"
                    size="xs"
                    color="amber"
                    :to="loginRedirectPath"
                    icon="i-heroicons-arrow-right-on-rectangle-20-solid"
                    label="Log in to start a crawl"
                  />
                  <template v-else-if="selectedVenueOnActiveCrawl">
                    <UButton
                      size="xs"
                      color="amber"
                      icon="i-heroicons-user-plus-20-solid"
                      label="Invite friends"
                      @click="openCrawlBuilder(true)"
                    />
                    <UButton
                      size="xs"
                      color="gray"
                      variant="soft"
                      icon="i-heroicons-list-bullet-20-solid"
                      label="View crawl"
                      @click="openCrawlBuilder()"
                    />
                  </template>
                  <UButton
                    v-else
                    size="xs"
                    color="amber"
                    icon="i-heroicons-flag-20-solid"
                    label="Start a crawl here"
                    :loading="crawlStartPending"
                    :disabled="crawlAddPending"
                    @click="startCrawlFromSelectedVenue"
                  />
                </div>
              </div>
            </div>
          </div>

          <p
            v-if="crawlAddMessage"
            class="text-center text-sm"
            :class="crawlAddMessageIsError
              ? 'text-red-600 dark:text-red-400'
              : 'text-emerald-700 dark:text-emerald-400'"
          >
            {{ crawlAddMessage }}
          </p>
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
            <p
              v-if="selectedVenueAddressLines.length"
              class="text-sm leading-6 text-gray-700 dark:text-gray-200"
            >
              {{ selectedVenueAddressLines.join(', ') }}
            </p>
            <p v-if="selectedVenueWebsiteHref" class="text-sm">
              <a
                :href="selectedVenueWebsiteHref"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {{ selectedVenueWebsiteLabel }}
              </a>
            </p>
            <div v-if="selectedVenueFeatureLines.length" class="text-sm text-gray-700 dark:text-gray-200">
              <h4 class="mb-2 font-semibold text-gray-900 dark:text-white">Features</h4>
              <ul class="space-y-1">
                <li v-for="feature in selectedVenueFeatureLines" :key="feature">
                  {{ feature }}
                </li>
              </ul>
            </div>
            <p
              v-if="selectedVenueDescription"
              class="text-sm leading-6 text-gray-700 dark:text-gray-200"
            >
              {{ selectedVenueDescription }}
            </p>
          </template>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useVenueStore } from '@/store/venue.js'
import { useEventStore } from '@/store/event.js'
import { venueStaticMapUrl } from '@/utils/format-venue'
import {
  CRAWL_ARRIVAL_RADIUS_METERS,
  findNearestStopIndex,
  haversineMiles,
} from '@/utils/crawl-distance'
import {
  EMPTY_MAP_FILTERS,
  MAP_FEATURE_FLAGS,
  MAP_META_FLAGS,
  flagBit,
  formatDistanceFromYou,
  type MapVenueFilters,
  type MapVenuePoint,
} from '@/utils/map-filters'

useSiteSeo({
  title: 'Map of UK pubs and venues',
  description: 'Explore pubs and venues on an interactive map. Find events and listings near you.',
  path: '/map',
  page: { key: 'map' },
})

const venueStore = useVenueStore()
const eventStore = useEventStore()
const mapboxToken = useMapboxToken()
const { isLoggedIn, initializeAuth } = useAuth()
const {
  crawls,
  activeCrawl,
  stops,
  legs,
  currentStopIndex,
  addVenueStop,
  removeVenueStop,
  isVenueOnActiveCrawl,
  loadCrawl,
  setProgressAndSave,
  initialize: initializePubCrawl,
  errorMessage: crawlErrorMessage,
  canEditActiveCrawl,
  createCrawl,
} = usePubCrawl()

const route = useRoute()
const selectedCity = ref('')
const citySelectRef = ref<{ $el?: HTMLElement } | null>(null)
const cityNames = computed(() => eventStore.cities.map((city) => city.name))

const isCrawlBuilderOpen = ref(false)
const crawlBuilderFocusInvite = ref(false)
const crawlAddMessage = ref('')
const crawlAddMessageIsError = ref(false)
const crawlAddPending = ref(false)
const crawlStartPending = ref(false)
const arrivalMessage = ref('')
const selectedCrawlId = ref('')
let crawlAddMessageTimeout: ReturnType<typeof setTimeout> | null = null
let arrivalMessageTimeout: ReturnType<typeof setTimeout> | null = null
let geoWatchId: number | null = null
let lastArrivalIndex: number | null = null

// ---- Filters -------------------------------------------------------------
const filters = ref<MapVenueFilters>({ ...EMPTY_MAP_FILTERS, features: [] })
const mapTypes = ref<string[]>([])
const visibleVenueCount = ref(0)

// ---- User location (distance labels, near-me filter, crawl auto check-in) --
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const isLocating = ref(false)
const locationError = ref('')
let locationErrorTimeout: ReturnType<typeof setTimeout> | null = null
let geolocateControl: InstanceType<typeof import('mapbox-gl').default.GeolocateControl> | null = null

// ---- Getting-started overlay ---------------------------------------------
const GETTING_STARTED_STORAGE_KEY = 'ukpubs-map-getting-started-dismissed'
const GETTING_STARTED_MAX_ZOOM = 10
const mapZoom = ref(5)
const gettingStartedDismissed = ref(false)
const forceGettingStarted = ref(false)
const isMapZoomedIn = computed(() => mapZoom.value >= GETTING_STARTED_MAX_ZOOM)
const showGettingStarted = computed(() =>
  !mapError.value
  && !gettingStartedDismissed.value
  && (forceGettingStarted.value || !isMapZoomedIn.value),
)

const loginRedirectPath = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath || '/map')}`)

const crawlSelectOptions = computed(() =>
  crawls.value.map((crawl) => ({
    label: `${crawl.name} (${crawl.stopCount})${crawl.role === 'member' ? ' · invited' : ''}`,
    value: crawl.id,
  })),
)

const crawlButtonLabel = computed(() => {
  const name = activeCrawl.value?.name
  if (!canEditActiveCrawl.value) {
    if (!name) return 'View crawls'
    return crawls.value.length > 1
      ? `View · ${crawls.value.length} lists`
      : `View · ${name}`
  }
  if (!name) return 'Manage crawls'
  return crawls.value.length > 1
    ? `Manage · ${crawls.value.length} lists`
    : `Manage · ${name}`
})

const selectedVenueOnActiveCrawl = computed(() =>
  isVenueOnActiveCrawl(selectedVenue.value?.id),
)

const showCrawlToggleButton = computed(() =>
  isLoggedIn.value && canEditActiveCrawl.value,
)

/** Lists the current user can add pubs to (invited lists are view-only). */
const editableCrawls = computed(() =>
  crawls.value.filter((crawl) => crawl.role !== 'member' && crawl.canEdit !== false),
)

const NEW_CRAWL_CHOICE = '__new__'
const modalCrawlSelectId = 'map-venue-crawl-list'
const crawlSwitching = ref(false)

const modalCrawlOptions = computed(() => [
  ...editableCrawls.value.map((crawl) => ({
    label: `${crawl.name} (${crawl.stopCount} ${crawl.stopCount === 1 ? 'stop' : 'stops'})`,
    value: crawl.id,
  })),
  { label: '+ New crawl starting here', value: NEW_CRAWL_CHOICE },
])

/** Dropdown in the pub modal: picking a list makes it the active crawl so Add/Remove targets it. */
const modalCrawlChoice = computed({
  get: () => {
    const activeId = activeCrawl.value?.id
    if (activeId && editableCrawls.value.some((crawl) => crawl.id === activeId)) return activeId
    return editableCrawls.value[0]?.id || ''
  },
  set: (value: string) => {
    if (value === NEW_CRAWL_CHOICE) {
      void startCrawlFromSelectedVenue()
      return
    }
    if (value && value !== activeCrawl.value?.id) selectedCrawlId.value = value
  },
})

const selectedVenueStopNumber = computed(() => {
  const id = selectedVenue.value?.id
  if (!id) return 0
  const index = stops.value.findIndex((stop) => stop.venueId === id)
  return index >= 0 ? index + 1 : 0
})

watch(
  () => activeCrawl.value?.id,
  (id) => {
    selectedCrawlId.value = id || ''
  },
  { immediate: true },
)

watch(selectedCrawlId, async (id, prev) => {
  if (!id || id === activeCrawl.value?.id || id === prev) return
  crawlSwitching.value = true
  try {
    await loadCrawl(id)
    updateCrawlRouteOnMap()
    // Don't yank the map away from the pub the user is looking at.
    if (!isVenueModalOpen.value) fitMapToCrawlStops()
  } finally {
    crawlSwitching.value = false
  }
})

watch(
  [stops, currentStopIndex, () => activeCrawl.value?.id],
  () => {
    updateCrawlRouteOnMap()
  },
  { deep: true },
)

watch(
  () => stops.value.map((s) => `${s.id}:${s.latitude}:${s.longitude}`).join('|'),
  (next, prev) => {
    if (!next || next === prev) return
    // Fit when the active route's stop set changes (load / add / reorder coords)
    fitMapToCrawlStops()
  },
)

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) startLocationWatch()
  // Logging out keeps the watch alive for distance labels; just forget crawl arrival state.
  else lastArrivalIndex = null
})

function openCrawlBuilder(focusInvite = false) {
  crawlBuilderFocusInvite.value = focusInvite
  isCrawlBuilderOpen.value = true
  if (!focusInvite) {
    crawlAddMessage.value = ''
    crawlAddMessageIsError.value = false
  }
  // On small screens the modal and slideover would stack; hand over to the builder.
  if (focusInvite && !isDesktopViewport.value) isVenueModalOpen.value = false
}

function onCrawlUpdated(_crawl: { id: string; name: string } | null) {
  selectedCrawlId.value = activeCrawl.value?.id || ''
  updateCrawlRouteOnMap()
}

function showCrawlToggleMessage(message: string, isError = false) {
  crawlAddMessage.value = message
  crawlAddMessageIsError.value = isError
  if (crawlAddMessageTimeout) clearTimeout(crawlAddMessageTimeout)
  crawlAddMessageTimeout = setTimeout(() => {
    crawlAddMessage.value = ''
    crawlAddMessageIsError.value = false
  }, 4000)
}

async function toggleSelectedVenueOnCrawl() {
  if (!selectedVenue.value || crawlAddPending.value) return
  if (!canEditActiveCrawl.value) {
    showCrawlToggleMessage('Only the crawl creator can add or remove pubs.', true)
    return
  }
  crawlAddMessage.value = ''
  crawlAddMessageIsError.value = false
  crawlAddPending.value = true

  const venueName = selectedVenue.value.name
  const crawlName = activeCrawl.value?.name || 'your crawl'
  const removing = selectedVenueOnActiveCrawl.value

  try {
    await initializePubCrawl()

    if (removing) {
      const ok = await removeVenueStop(selectedVenue.value.id)
      if (ok) {
        showCrawlToggleMessage(`Removed ${venueName} from ${crawlName}.`)
      } else {
        isCrawlBuilderOpen.value = true
        showCrawlToggleMessage(
          crawlErrorMessage.value || 'Could not remove this pub from the crawl.',
          true,
        )
      }
      return
    }

    const ok = await addVenueStop({
      id: selectedVenue.value.id,
      name: selectedVenue.value.name,
      lat: selectedVenue.value.lat,
      lng: selectedVenue.value.lng,
    })

    if (ok) {
      // Stay on the map so the next pin can be added straight away.
      showCrawlToggleMessage(
        `Added ${venueName} to ${crawlName} as stop ${stops.value.length}. Pick another pin or invite friends below.`,
      )
    } else {
      isCrawlBuilderOpen.value = true
      showCrawlToggleMessage(
        crawlErrorMessage.value || 'Could not add this pub — create or open a crawl first.',
        true,
      )
    }
  } catch (err: any) {
    isCrawlBuilderOpen.value = true
    showCrawlToggleMessage(
      err?.data?.statusMessage
        || err?.message
        || (removing ? 'Could not remove this pub from the crawl.' : 'Could not add this pub to the crawl.'),
      true,
    )
  } finally {
    crawlAddPending.value = false
  }
}

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
let activePopupVenueId: number | null = null
const hiddenLegacyLayerIds = ref(new Set<string>())

const SOURCE_ID = 'venue-clusters'
const LAYER_CLUSTERS = 'venue-clusters-circle'
const LAYER_CLUSTER_COUNT = 'venue-clusters-count'
const LAYER_UNCLUSTERED = 'venue-unclustered-point'

const CRAWL_ROUTE_SOURCE = 'crawl-route'
const CRAWL_STOPS_SOURCE = 'crawl-stops'
const CRAWL_LABELS_SOURCE = 'crawl-distance-labels'
const CRAWL_ROUTE_LAYER = 'crawl-route-line'
const CRAWL_STOPS_CIRCLE = 'crawl-stops-circle'
const CRAWL_STOPS_NUMBER = 'crawl-stops-number'
const CRAWL_DISTANCE_LAYER = 'crawl-distance-label'

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
  void initializeAuth()
  void initializePubCrawl()
  void eventStore.fetchCities()
  void loadFilterData()
  void loadMapLegend()
  try {
    gettingStartedDismissed.value = localStorage.getItem(GETTING_STARTED_STORAGE_KEY) === '1'
  } catch {
    gettingStartedDismissed.value = false
  }
  void startLocationWatchIfPermitted()
  await createMap()
})

watch(filters, () => applyMapFilters(), { deep: true })

function clearFilters() {
  filters.value = { ...EMPTY_MAP_FILTERS, features: [] }
  venueName.value = 'VENUES'
}

function dismissGettingStarted() {
  gettingStartedDismissed.value = true
  forceGettingStarted.value = false
  try {
    localStorage.setItem(GETTING_STARTED_STORAGE_KEY, '1')
  } catch {
    // ignore storage failures (private mode etc.)
  }
}

function reopenGettingStarted() {
  gettingStartedDismissed.value = false
  forceGettingStarted.value = true
}

function focusCitySearch() {
  const el = citySelectRef.value?.$el
  const select = el?.querySelector?.('select') as HTMLSelectElement | null | undefined
  ;(select || el)?.focus?.()
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
}

async function loadMapLegend() {
  try {
    const legend = await $fetch<{ types: string[] }>('/api/venues/map-legend')
    mapTypes.value = legend.types || []
  } catch (err) {
    console.warn('Map legend unavailable:', err)
  }
}

function showLocationError(message: string) {
  locationError.value = message
  if (locationErrorTimeout) clearTimeout(locationErrorTimeout)
  locationErrorTimeout = setTimeout(() => {
    locationError.value = ''
  }, 6000)
}

/** Silently start tracking if the browser has already granted geolocation. */
async function startLocationWatchIfPermitted() {
  if (!import.meta.client || !navigator.geolocation || !navigator.permissions?.query) return
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    if (status.state === 'granted') startLocationWatch()
    status.onchange = () => {
      if (status.state === 'granted') startLocationWatch()
    }
  } catch {
    // Permissions API unsupported — wait for an explicit user action instead
  }
}

/** Explicit "use my location" action: prompts, centres the map and enables distance labels. */
function requestUserLocation() {
  if (!import.meta.client || !navigator.geolocation) {
    showLocationError('Your browser does not support location.')
    return
  }
  if (isLocating.value) return
  isLocating.value = true
  locationError.value = ''

  navigator.geolocation.getCurrentPosition(
    (position) => {
      isLocating.value = false
      setUserLocation(position.coords.latitude, position.coords.longitude)
      startLocationWatch()
      if (map.value) {
        map.value.flyTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 14 })
      }
      if (!gettingStartedDismissed.value) dismissGettingStarted()
    },
    (err) => {
      isLocating.value = false
      showLocationError(
        err.code === err.PERMISSION_DENIED
          ? 'Location access was blocked. Allow location for this site to see distances and pubs near you.'
          : 'Could not work out your location right now. Try again in a moment.',
      )
    },
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 },
  )
}

function setUserLocation(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  const prev = userLocation.value
  userLocation.value = { lat, lng }
  // Re-run the near-me filter only when we have moved a meaningful distance.
  if (filters.value.nearMeMiles > 0 && (!prev || haversineMiles(prev.lat, prev.lng, lat, lng) > 0.05)) {
    applyMapFilters()
  }
  if (popup && activePopupVenueId) refreshActivePopupDistance()
}

function distanceMilesTo(lat: number, lng: number) {
  const here = userLocation.value
  if (!here) return null
  return haversineMiles(here.lat, here.lng, lat, lng)
}

const selectedVenueDistanceLabel = computed(() => {
  const venue = selectedVenue.value
  if (!venue || !userLocation.value) return ''
  const miles = distanceMilesTo(venue.lat, venue.lng)
  return miles == null ? '' : formatDistanceFromYou(miles)
})

async function startCrawlFromSelectedVenue() {
  const venue = selectedVenue.value
  if (!venue || crawlStartPending.value || !isLoggedIn.value) return
  crawlStartPending.value = true
  crawlAddMessage.value = ''
  crawlAddMessageIsError.value = false

  try {
    await initializePubCrawl()
    const crawl = await createCrawl(`${venue.name} crawl`)
    if (!crawl) {
      showCrawlToggleMessage(crawlErrorMessage.value || 'Could not start a crawl right now.', true)
      return
    }
    const ok = await addVenueStop({ id: venue.id, name: venue.name, lat: venue.lat, lng: venue.lng })
    selectedCrawlId.value = crawl.id
    updateCrawlRouteOnMap()
    if (ok) {
      showCrawlToggleMessage(`Started "${crawl.name}" with ${venue.name} as stop 1. Add more pubs, then invite friends.`)
    } else {
      showCrawlToggleMessage(crawlErrorMessage.value || `Created "${crawl.name}" but could not add ${venue.name}.`, true)
    }
    openCrawlBuilder(true)
  } catch (err: any) {
    showCrawlToggleMessage(err?.data?.statusMessage || err?.message || 'Could not start a crawl right now.', true)
  } finally {
    crawlStartPending.value = false
  }
}

const venueNameSelected = (name: string) => {
  venueName.value = name.toString().toUpperCase()
  filters.value = {
    ...filters.value,
    venueName: venueName.value === 'VENUES' ? '' : venueName.value,
  }
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
const selectedVenueDescription = computed(() => {
  const description = readVenueString(selectedVenueDetails.value, 'description')
  return description && description.toLowerCase() !== 'null' ? description : ''
})
const selectedVenueWebsite = computed(() => {
  const website = readVenueString(selectedVenueDetails.value, 'website')
  if (!website || website.toLowerCase() === 'null') return ''
  return website
})
const selectedVenueWebsiteHref = computed(() => websiteHref(selectedVenueWebsite.value))
const selectedVenueWebsiteLabel = computed(() => {
  const website = selectedVenueWebsite.value
  if (!website) return ''
  return website.replace(/^https?:\/\//i, '').replace(/\/$/, '')
})
const selectedVenueStaticMapUrl = computed(() => {
  if (!mapboxToken.value || !selectedVenue.value) return ''
  const details = selectedVenueDetails.value
  return venueStaticMapUrl(
    {
      latitude: details?.latitude ?? selectedVenue.value.lat,
      longitude: details?.longitude ?? selectedVenue.value.lng,
    },
    mapboxToken.value,
    640,
    240,
  ) || ''
})

let desktopMediaQuery: MediaQueryList | null = null
const venueDetailsCache = new Map<number, VenueDetails>()

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
    geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    })
    map.value.addControl(geolocateControl, 'bottom-right')
    geolocateControl.on('geolocate', (e: { coords?: { latitude: number; longitude: number } }) => {
      if (!e?.coords) return
      setUserLocation(e.coords.latitude, e.coords.longitude)
      startLocationWatch()
    })
    geolocateControl.on('error', (e: { code?: number }) => {
      if (e?.code === 1) {
        showLocationError('Location access was blocked. Allow location for this site to see distances and pubs near you.')
      }
    })

    mapZoom.value = map.value.getZoom()
    map.value.on('zoomend', () => {
      mapZoom.value = map.value?.getZoom?.() ?? mapZoom.value
      // Once the user has zoomed in far enough the intro has done its job.
      if (forceGettingStarted.value && isMapZoomedIn.value) forceGettingStarted.value = false
    })

    map.value.on('load', () => {
      map.value.resize()
      ensureClusterLayers()
      ensureCrawlRouteLayers()
      bindClusterHandlers()
      updateMapLayer(venueName.value)
      void loadVenueClusters()
      updateCrawlRouteOnMap()
      if (isLoggedIn.value) startLocationWatch()
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

function applyMapFilters() {
  updateMapLayer(venueName.value)
}

function updateMapLayer(layerId: string) {
  isOpenRight.slideover = false
  if (!map.value) {
    console.error('Map is not initialized.')
    return
  }

  hideLegacyVenueLayers(layerId)

  const points = filteredVenuePoints(layerId)
  visibleVenueCount.value = points.length
  const source = map.value.getSource(SOURCE_ID)
  source?.setData(buildVenueGeoJson(points))
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
  const byName = !selected || selected === 'VENUES' ? null : selected
  const active = filters.value
  const typeIndex = active.venueType ? mapTypes.value.indexOf(active.venueType) : -1
  const featureMask = active.features.reduce((mask, key) => {
    const flag = MAP_FEATURE_FLAGS.find((f) => f.key === key)
    return flag ? mask | flagBit(flag.bit) : mask
  }, 0)
  const eventsBit = active.hasEvents ? flagBit(MAP_META_FLAGS.hasEvents) : 0
  const photoBit = active.hasPhoto ? flagBit(MAP_META_FLAGS.hasPhoto) : 0
  const here = active.nearMeMiles > 0 ? userLocation.value : null
  const radius = active.nearMeMiles

  if (!byName && typeIndex < 0 && !active.venueType && !featureMask && !eventsBit && !photoBit && !here) {
    return mapVenues.value
  }

  return mapVenues.value.filter((venue) => {
    if (byName && venue.name?.toUpperCase() !== byName) return false
    if (active.venueType && (venue.t ?? 0) !== typeIndex) return false
    const mask = venue.f ?? 0
    if (featureMask && (mask & featureMask) !== featureMask) return false
    if (eventsBit && !(mask & eventsBit)) return false
    if (photoBit && !(mask & photoBit)) return false
    if (here && haversineMiles(here.lat, here.lng, venue.lat, venue.lng) > radius) return false
    return true
  })
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
        '#16A394',
        25,
        '#0E8579',
        100,
        '#F5B301',
        500,
        '#E53935',
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
      'circle-color': '#E53935',
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
    const venueId = Number(feature.properties?.id || 0)
    activePopupVenueId = venueId || null
    activePopupState = { venuename, coordinates }

    popup?.remove()
    popup = new mapboxgl.Popup({ closeButton: false })
      .setLngLat(coordinates)
      .setHTML(renderVenuePopupHtml(venuename, popupAddressForVenue(venueId), popupDistanceLabel(coordinates)))
      .addTo(map.value)

    if (venueId && !venueDetailsCache.has(venueId)) {
      void fetchVenueDetailsForPopup(venueId, venuename, coordinates)
    }
  })

  map.value.on('mouseleave', LAYER_UNCLUSTERED, () => {
    popupTimeout = setTimeout(() => {
      popup?.remove()
      popup = null
      activePopupVenueId = null
      activePopupState = null
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
  return compactAddressLines({
    address: String(properties.address || ''),
    address2: String(properties.address2 || ''),
    town: String(properties.town || ''),
    county: String(properties.county || ''),
    postcode: String(properties.postcode || ''),
  }).join(', ')
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
    lat,
    lng,
  }
}

async function loadSelectedVenueDetails(id: number) {
  if (!id) return
  isVenueDetailsLoading.value = true
  venueDetailsError.value = ''
  try {
    selectedVenueDetails.value = await fetchVenueDetailsCached(id)
  } catch (err) {
    console.error('Failed to load venue details:', err)
    venueDetailsError.value = 'Unable to load full venue details. Please try again.'
  } finally {
    isVenueDetailsLoading.value = false
  }
}

async function fetchVenueDetailsCached(id: number) {
  const cached = venueDetailsCache.get(id)
  if (cached) return cached

  const details = await venueStore.fetchVenueDetails(id)
  venueDetailsCache.set(id, details)
  return details
}

function popupAddressForVenue(id: number) {
  const details = venueDetailsCache.get(id)
  return details ? formatAddress(details) : ''
}

function renderVenuePopupHtml(venuename: unknown, address = '', distance = '') {
  return `<div class="p-2">
    <h1 class="text-lg font-semibold">${escapeHtml(venuename)}</h1>
    ${address ? `<p class="mt-1 text-sm leading-snug">${escapeHtml(address)}</p>` : '<p class="mt-1 text-sm leading-snug text-gray-500">Loading address...</p>'}
    ${distance ? `<p class="mt-1 text-xs font-medium text-emerald-700">📍 ${escapeHtml(distance)}</p>` : ''}
    <p class="mt-1 text-xs text-gray-500">Click for details &amp; to start a crawl</p>
  </div>`
}

function popupDistanceLabel(coordinates: [number, number]) {
  const [lng, lat] = coordinates
  const miles = distanceMilesTo(lat, lng)
  return miles == null ? '' : formatDistanceFromYou(miles)
}

let activePopupState: { venuename: unknown; coordinates: [number, number] } | null = null

function refreshActivePopupDistance() {
  if (!popup || !activePopupVenueId || !activePopupState) return
  const { venuename, coordinates } = activePopupState
  popup.setHTML(renderVenuePopupHtml(venuename, popupAddressForVenue(activePopupVenueId), popupDistanceLabel(coordinates)))
}

async function fetchVenueDetailsForPopup(id: number, venuename: unknown, coordinates: [number, number]) {
  try {
    const details = await fetchVenueDetailsCached(id)
    if (!popup || !map.value || activePopupVenueId !== id) return
    popup
      .setLngLat(coordinates)
      .setHTML(renderVenuePopupHtml(venuename, formatAddress(details), popupDistanceLabel(coordinates)))
  } catch (err) {
    console.error('Failed to load venue popup details:', err)
  }
}

function readVenueString(venue: object | null | undefined, key: string) {
  const value = (venue as Record<string, unknown> | null | undefined)?.[key]
  if (value == null) return ''
  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return ''
  return text
}

function websiteHref(value: string) {
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function updateDesktopViewport() {
  isDesktopViewport.value = desktopMediaQuery?.matches ?? true
}

function emptyFeatureCollection() {
  return { type: 'FeatureCollection' as const, features: [] as any[] }
}

function ensureCrawlRouteLayers() {
  if (!map.value) return

  if (!map.value.getSource(CRAWL_ROUTE_SOURCE)) {
    map.value.addSource(CRAWL_ROUTE_SOURCE, {
      type: 'geojson',
      data: emptyFeatureCollection(),
    })
  }
  if (!map.value.getSource(CRAWL_STOPS_SOURCE)) {
    map.value.addSource(CRAWL_STOPS_SOURCE, {
      type: 'geojson',
      data: emptyFeatureCollection(),
    })
  }
  if (!map.value.getSource(CRAWL_LABELS_SOURCE)) {
    map.value.addSource(CRAWL_LABELS_SOURCE, {
      type: 'geojson',
      data: emptyFeatureCollection(),
    })
  }

  if (!map.value.getLayer(CRAWL_ROUTE_LAYER)) {
    map.value.addLayer({
      id: CRAWL_ROUTE_LAYER,
      type: 'line',
      source: CRAWL_ROUTE_SOURCE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#b45309',
        'line-width': 3,
        'line-dasharray': [1, 2],
        'line-opacity': 0.9,
      },
    })
  }

  if (!map.value.getLayer(CRAWL_STOPS_CIRCLE)) {
    map.value.addLayer({
      id: CRAWL_STOPS_CIRCLE,
      type: 'circle',
      source: CRAWL_STOPS_SOURCE,
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'isCurrent'], 1],
          11,
          8,
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'isCurrent'], 1],
          '#059669',
          '#0E8579',
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })
  }

  if (!map.value.getLayer(CRAWL_STOPS_NUMBER)) {
    map.value.addLayer({
      id: CRAWL_STOPS_NUMBER,
      type: 'symbol',
      source: CRAWL_STOPS_SOURCE,
      layout: {
        'text-field': ['get', 'stopNumber'],
        'text-size': 11,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    })
  }

  if (!map.value.getLayer(CRAWL_DISTANCE_LAYER)) {
    map.value.addLayer({
      id: CRAWL_DISTANCE_LAYER,
      type: 'symbol',
      source: CRAWL_LABELS_SOURCE,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, -0.6],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#78350f',
        'text-halo-color': '#fffbeb',
        'text-halo-width': 1.5,
      },
    })
  }
}

let crawlRouteRequestId = 0

function updateCrawlRouteOnMap() {
  if (!map.value?.getSource) return
  if (!map.value.isStyleLoaded?.() && !map.value.loaded?.()) return

  try {
    ensureCrawlRouteLayers()
  } catch {
    return
  }

  const routeSource = map.value.getSource(CRAWL_ROUTE_SOURCE)
  const stopsSource = map.value.getSource(CRAWL_STOPS_SOURCE)
  const labelsSource = map.value.getSource(CRAWL_LABELS_SOURCE)
  if (!routeSource || !stopsSource || !labelsSource) return

  const coords = stops.value
    .map((stop) => {
      const lat = Number(stop.latitude)
      const lng = Number(stop.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null
      return [lng, lat] as [number, number]
    })
    .filter(Boolean) as [number, number][]

  const stopFeatures = stops.value.flatMap((stop, index) => {
    const lat = Number(stop.latitude)
    const lng = Number(stop.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return []
    return [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      properties: {
        stopNumber: String(index + 1),
        name: stop.venueName,
        isCurrent: index === currentStopIndex.value ? 1 : 0,
      },
    }]
  })

  const labelFeatures = legs.value.flatMap((leg) => {
    if (leg.midLat == null || leg.midLng == null || !leg.shortLabel || leg.shortLabel === '?') return []
    return [{
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [leg.midLng, leg.midLat],
      },
      properties: {
        label: leg.shortLabel,
      },
    }]
  })

  // Straight dotted fallback immediately, then upgrade to walking directions when available
  routeSource.setData({
    type: 'FeatureCollection',
    features: coords.length >= 2
      ? [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
          properties: {},
        }]
      : [],
  })
  stopsSource.setData({ type: 'FeatureCollection', features: stopFeatures })
  labelsSource.setData({ type: 'FeatureCollection', features: labelFeatures })

  if (coords.length >= 2 && mapboxToken.value) {
    const requestId = ++crawlRouteRequestId
    void fetchWalkingRouteGeometry(coords).then((walkingCoords) => {
      if (requestId !== crawlRouteRequestId) return
      if (!walkingCoords?.length || !map.value?.getSource(CRAWL_ROUTE_SOURCE)) return
      map.value.getSource(CRAWL_ROUTE_SOURCE).setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: walkingCoords,
          },
          properties: {},
        }],
      })
    })
  }
}

async function fetchWalkingRouteGeometry(coords: [number, number][]) {
  if (!mapboxToken.value || coords.length < 2) return null
  // Mapbox Directions allows up to 25 coordinates per request
  const limited = coords.slice(0, 25)
  const path = limited.map(([lng, lat]) => `${lng},${lat}`).join(';')
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/${path}`
    + `?geometries=geojson&overview=full&access_token=${encodeURIComponent(mapboxToken.value)}`

  try {
    const data = await $fetch<{
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>
    }>(url)
    const geometry = data.routes?.[0]?.geometry?.coordinates
    return geometry?.length ? geometry : null
  } catch (err) {
    console.warn('Walking directions unavailable, using straight crawl line:', err)
    return null
  }
}

function fitMapToCrawlStops() {
  if (!map.value || !mapboxgl) return
  const points = stops.value
    .map((stop) => {
      const lat = Number(stop.latitude)
      const lng = Number(stop.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null
      return [lng, lat] as [number, number]
    })
    .filter(Boolean) as [number, number][]

  if (!points.length) return
  if (points.length === 1) {
    map.value.flyTo({ center: points[0], zoom: 14 })
    return
  }

  const bounds = points.reduce(
    (b, coord) => b.extend(coord),
    new mapboxgl.LngLatBounds(points[0], points[0]),
  )
  map.value.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 800 })
}

/**
 * Single position watch shared by the distance labels, the near-me filter and
 * crawl auto check-in. Safe to call repeatedly.
 */
function startLocationWatch() {
  if (!import.meta.client || !navigator.geolocation) return
  if (geoWatchId != null) return

  geoWatchId = navigator.geolocation.watchPosition(
    (position) => {
      setUserLocation(position.coords.latitude, position.coords.longitude)
      if (isLoggedIn.value) {
        void handleCrawlGeolocation(position.coords.latitude, position.coords.longitude)
      }
    },
    (err) => {
      console.warn('Geolocation unavailable:', err.message)
      if (err.code === err.PERMISSION_DENIED) stopLocationWatch()
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    },
  )
}

function stopLocationWatch() {
  if (geoWatchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(geoWatchId)
  }
  geoWatchId = null
  lastArrivalIndex = null
}

async function handleCrawlGeolocation(lat: number, lng: number) {
  if (!activeCrawl.value || stops.value.length < 1) return
  // Only the crawl creator can advance progress (including auto check-in)
  if (!canEditActiveCrawl.value) return

  const nearest = findNearestStopIndex(lat, lng, stops.value, CRAWL_ARRIVAL_RADIUS_METERS)
  if (!nearest) return
  if (nearest.index === currentStopIndex.value) return
  if (lastArrivalIndex === nearest.index) return

  // Prefer arriving at the next stop in order, but also allow catching up if they skip
  const ok = await setProgressAndSave(nearest.index, { fromArrival: true })
  if (!ok) return

  lastArrivalIndex = nearest.index
  const stop = stops.value[nearest.index]
  arrivalMessage.value = `You've arrived at stop ${nearest.index + 1}: ${stop?.venueName || 'pub'} (within ${CRAWL_ARRIVAL_RADIUS_METERS}m)`
  if (arrivalMessageTimeout) clearTimeout(arrivalMessageTimeout)
  arrivalMessageTimeout = setTimeout(() => {
    arrivalMessage.value = ''
  }, 6000)
}

onBeforeUnmount(() => {
  if (popupTimeout) clearTimeout(popupTimeout)
  if (crawlAddMessageTimeout) clearTimeout(crawlAddMessageTimeout)
  if (arrivalMessageTimeout) clearTimeout(arrivalMessageTimeout)
  if (locationErrorTimeout) clearTimeout(locationErrorTimeout)
  stopLocationWatch()
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
