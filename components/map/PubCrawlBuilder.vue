<template>
  <div class="flex h-full flex-col">
    <div class="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Pub crawl builder</h2>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Pick pubs on the map, reorder the route, and track your progress.
        </p>
      </div>
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-x-mark-20-solid"
        aria-label="Close pub crawl builder"
        @click="$emit('close')"
      />
    </div>

    <div class="flex-1 space-y-4 overflow-y-auto p-4">
      <UAlert
        v-if="errorMessage"
        color="red"
        variant="soft"
        :description="errorMessage"
        :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'red', variant: 'link' }"
        @close="errorMessage = ''"
      />

      <!-- Saved crawls -->
      <section class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500">Your crawls</h3>
          <UButton
            size="xs"
            color="gray"
            variant="ghost"
            icon="i-heroicons-arrow-path-20-solid"
            :loading="loadingList"
            aria-label="Refresh crawls"
            @click="loadCrawls"
          />
        </div>

        <div v-if="loadingList && !crawls.length" class="text-sm text-gray-500">Loading…</div>
        <ul v-else-if="crawls.length" class="space-y-1">
          <li
            v-for="crawl in crawls"
            :key="crawl.id"
            class="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
            :class="crawl.id === activeCrawl?.id
              ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40'
              : 'border-gray-200 dark:border-gray-800'"
          >
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              @click="loadCrawl(crawl.id)"
            >
              <span class="block truncate font-medium text-gray-900 dark:text-white">{{ crawl.name }}</span>
              <span class="text-xs text-gray-500">
                {{ crawl.stopCount }} stop{{ crawl.stopCount === 1 ? '' : 's' }}
                <template v-if="crawl.stopCount">
                  · at #{{ Math.min(crawl.currentStopIndex + 1, crawl.stopCount) }}
                </template>
              </span>
            </button>
            <UButton
              size="xs"
              color="red"
              variant="ghost"
              icon="i-heroicons-trash-20-solid"
              aria-label="Delete crawl"
              :loading="deletingId === crawl.id"
              @click="deleteCrawl(crawl.id)"
            />
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No saved crawls yet. Create one below.</p>
      </section>

      <!-- Create / rename -->
      <section class="space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-800">
        <label class="block text-sm font-medium text-gray-900 dark:text-white">
          {{ activeCrawl ? 'Crawl name' : 'New crawl name' }}
        </label>
        <div class="flex gap-2">
          <UInput
            v-model="draftName"
            class="flex-1"
            placeholder="e.g. Friday night in Liverpool"
            maxlength="120"
            @keydown.enter.prevent="activeCrawl ? saveMeta() : createCrawl()"
          />
          <UButton
            v-if="!activeCrawl"
            color="amber"
            :loading="saving"
            :disabled="!draftName.trim()"
            label="Create"
            @click="createCrawl"
          />
          <UButton
            v-else
            color="amber"
            variant="soft"
            :loading="saving"
            :disabled="!draftName.trim() || draftName.trim() === activeCrawl.name"
            label="Rename"
            @click="saveMeta"
          />
        </div>
        <UButton
          v-if="activeCrawl"
          size="xs"
          color="gray"
          variant="link"
          label="Start a new crawl"
          @click="startFresh"
        />
      </section>

      <template v-if="activeCrawl">
        <!-- Manual add -->
        <section class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Add a pub</h3>
          <p class="text-xs text-gray-500">
            Click a pub on the map and use “Add to crawl”, or type a name here.
          </p>
          <div class="flex gap-2">
            <UInput
              v-model="manualName"
              class="flex-1"
              placeholder="Type a pub name…"
              maxlength="200"
              @keydown.enter.prevent="addManualStop"
            />
            <UButton
              color="gray"
              variant="soft"
              :disabled="!manualName.trim() || addingStop"
              :loading="addingStop"
              label="Add"
              @click="addManualStop"
            />
          </div>
        </section>

        <!-- Ordered stops -->
        <section class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              Route
              <span v-if="stops.length" class="font-normal text-gray-500">
                ({{ stops.length }} stop{{ stops.length === 1 ? '' : 's' }})
              </span>
            </h3>
            <span v-if="totalWalkLabel" class="text-xs text-gray-500">{{ totalWalkLabel }}</span>
          </div>

          <p v-if="!stops.length" class="text-sm text-gray-500">
            No pubs yet. Select venues on the map or add one by name.
          </p>

          <ol v-else class="m-0 list-none space-y-0 p-0">
            <template v-for="(stop, index) in stops" :key="stop.id || `draft-${index}`">
              <li
                class="rounded-md border bg-white dark:bg-gray-900"
                :class="{
                  'border-amber-400 ring-1 ring-amber-400': dragIndex === index,
                  'border-amber-300': dropIndex === index && dragIndex !== index,
                  'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30': index === currentStopIndex,
                  'border-gray-200 dark:border-gray-800': dragIndex !== index && dropIndex !== index && index !== currentStopIndex,
                }"
                draggable="true"
                @dragstart="onDragStart(index, $event)"
                @dragend="onDragEnd"
                @dragover.prevent="onDragOver(index)"
                @dragleave="onDragLeave(index)"
                @drop.prevent="onDrop(index)"
              >
                <div class="flex items-start gap-2 px-2 py-2">
                  <button
                    type="button"
                    class="mt-0.5 cursor-grab touch-none text-gray-400 active:cursor-grabbing"
                    aria-label="Drag to reorder"
                    @click.stop
                  >
                    <UIcon name="i-heroicons-bars-3-20-solid" class="h-5 w-5" />
                  </button>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                      >
                        {{ index + 1 }}
                      </span>
                      <span
                        v-if="index === 0"
                        class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        Start
                      </span>
                      <span
                        v-else-if="index === stops.length - 1"
                        class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        Finish
                      </span>
                      <span
                        v-if="index === currentStopIndex"
                        class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"
                      >
                        You are here
                      </span>
                    </div>
                    <p class="mt-1 truncate font-medium text-gray-900 dark:text-white">
                      {{ stop.venueName }}
                    </p>
                    <p v-if="!stop.venueId" class="text-xs text-gray-500">Added manually</p>
                  </div>
                  <div class="flex shrink-0 flex-col items-end gap-1">
                    <UButton
                      size="xs"
                      color="gray"
                      variant="ghost"
                      label="Here"
                      :disabled="index === currentStopIndex"
                      @click="setProgress(index)"
                    />
                    <UButton
                      size="xs"
                      color="red"
                      variant="ghost"
                      icon="i-heroicons-x-mark-20-solid"
                      aria-label="Remove stop"
                      @click="removeStop(index)"
                    />
                  </div>
                </div>
              </li>

              <li
                v-if="index < stops.length - 1"
                class="flex items-center gap-2 py-1.5 pl-8 text-xs text-gray-500"
              >
                <UIcon name="i-heroicons-arrow-long-down-20-solid" class="h-4 w-4 shrink-0 text-amber-600" />
                <span>{{ legLabel(index) }}</span>
              </li>
            </template>
          </ol>
        </section>

        <!-- Progress + save -->
        <section class="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-800">
          <div v-if="stops.length" class="space-y-1">
            <div class="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{{ currentStopIndex + 1 }} / {{ stops.length }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                class="h-full rounded-full bg-emerald-500 transition-all"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
            <div class="flex gap-2 pt-1">
              <UButton
                size="xs"
                color="gray"
                variant="soft"
                label="Previous"
                :disabled="currentStopIndex <= 0 || saving"
                @click="setProgress(currentStopIndex - 1)"
              />
              <UButton
                size="xs"
                color="emerald"
                variant="soft"
                label="Next pub"
                :disabled="currentStopIndex >= stops.length - 1 || saving"
                @click="setProgress(currentStopIndex + 1)"
              />
            </div>
          </div>

          <UButton
            block
            color="amber"
            :loading="saving"
            :disabled="!dirty"
            label="Save crawl"
            @click="saveCrawl"
          />
          <p v-if="lastSavedAt" class="text-center text-xs text-gray-500">
            Saved {{ lastSavedAt }}
          </p>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { buildCrawlLegs, formatWalkingDistance } from '@/utils/crawl-distance'

export type CrawlStop = {
  id?: string
  venueId: number | null
  venueName: string
  latitude: number | null
  longitude: number | null
  notes?: string | null
  sortOrder?: number
}

export type CrawlSummary = {
  id: string
  name: string
  currentStopIndex: number
  stopCount: number
  updatedAt: string
  stops?: CrawlStop[]
}

const emit = defineEmits<{
  close: []
  'crawl-updated': [crawl: CrawlSummary | null]
}>()

const { isLoggedIn, initializeAuth } = useAuth()

const crawls = ref<CrawlSummary[]>([])
const activeCrawl = ref<CrawlSummary | null>(null)
const stops = ref<CrawlStop[]>([])
const currentStopIndex = ref(0)
const draftName = ref('')
const manualName = ref('')
const loadingList = ref(false)
const saving = ref(false)
const addingStop = ref(false)
const deletingId = ref<string | null>(null)
const errorMessage = ref('')
const dirty = ref(false)
const lastSavedAt = ref('')
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

const legs = computed(() => buildCrawlLegs(stops.value))

const totalWalkLabel = computed(() => {
  const miles = legs.value.reduce((sum, leg) => sum + (leg.miles ?? 0), 0)
  if (!miles) return ''
  return `Total ~${formatWalkingDistance(miles).replace(/^~/, '')}`
})

const progressPercent = computed(() => {
  if (!stops.value.length) return 0
  return Math.round(((currentStopIndex.value + 1) / stops.value.length) * 100)
})

function legLabel(fromIndex: number) {
  return legs.value[fromIndex]?.label || 'Distance unknown'
}

function markDirty() {
  dirty.value = true
}

function startFresh() {
  activeCrawl.value = null
  stops.value = []
  currentStopIndex.value = 0
  draftName.value = ''
  dirty.value = false
  lastSavedAt.value = ''
  emit('crawl-updated', null)
}

async function loadCrawls() {
  if (!isLoggedIn.value) return
  loadingList.value = true
  errorMessage.value = ''
  try {
    crawls.value = await useAuthFetch<CrawlSummary[]>('/api/crawls')
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not load crawls'
  } finally {
    loadingList.value = false
  }
}

async function createCrawl() {
  const name = draftName.value.trim()
  if (!name) return
  saving.value = true
  errorMessage.value = ''
  try {
    const crawl = await useAuthFetch<CrawlSummary>('/api/crawls', {
      method: 'POST',
      body: { name },
    })
    activeCrawl.value = crawl
    stops.value = []
    currentStopIndex.value = 0
    dirty.value = false
    lastSavedAt.value = 'just now'
    await loadCrawls()
    emit('crawl-updated', crawl)
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not create crawl'
  } finally {
    saving.value = false
  }
}

async function loadCrawl(id: string) {
  errorMessage.value = ''
  try {
    const crawl = await useAuthFetch<CrawlSummary & { stops: CrawlStop[] }>(`/api/crawls/${id}`)
    activeCrawl.value = crawl
    draftName.value = crawl.name
    stops.value = (crawl.stops || []).map((s) => ({ ...s }))
    currentStopIndex.value = crawl.currentStopIndex || 0
    dirty.value = false
    lastSavedAt.value = formatSavedTime(crawl.updatedAt)
    emit('crawl-updated', crawl)
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not load crawl'
  }
}

async function saveMeta() {
  if (!activeCrawl.value) return
  const name = draftName.value.trim()
  if (!name) return
  saving.value = true
  errorMessage.value = ''
  try {
    const crawl = await useAuthFetch<CrawlSummary>(`/api/crawls/${activeCrawl.value.id}`, {
      method: 'PUT',
      body: { name },
    })
    activeCrawl.value = { ...activeCrawl.value, name: crawl.name }
    await loadCrawls()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not rename crawl'
  } finally {
    saving.value = false
  }
}

async function saveCrawl() {
  if (!activeCrawl.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const crawl = await useAuthFetch<CrawlSummary & { stops: CrawlStop[] }>(
      `/api/crawls/${activeCrawl.value.id}/stops`,
      {
        method: 'PUT',
        body: {
          name: draftName.value.trim() || activeCrawl.value.name,
          currentStopIndex: currentStopIndex.value,
          stops: stops.value.map((s) => ({
            venueId: s.venueId,
            venueName: s.venueName,
            latitude: s.latitude,
            longitude: s.longitude,
            notes: s.notes ?? null,
          })),
        },
      },
    )
    activeCrawl.value = crawl
    draftName.value = crawl.name
    stops.value = (crawl.stops || []).map((s) => ({ ...s }))
    currentStopIndex.value = crawl.currentStopIndex || 0
    dirty.value = false
    lastSavedAt.value = 'just now'
    await loadCrawls()
    emit('crawl-updated', crawl)
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not save crawl'
  } finally {
    saving.value = false
  }
}

async function deleteCrawl(id: string) {
  if (!confirm('Delete this pub crawl? This cannot be undone.')) return
  deletingId.value = id
  errorMessage.value = ''
  try {
    await useAuthFetch(`/api/crawls/${id}`, { method: 'DELETE' })
    if (activeCrawl.value?.id === id) startFresh()
    await loadCrawls()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not delete crawl'
  } finally {
    deletingId.value = null
  }
}

function addManualStop() {
  const name = manualName.value.trim()
  if (!name || !activeCrawl.value) return
  stops.value.push({
    venueId: null,
    venueName: name,
    latitude: null,
    longitude: null,
  })
  manualName.value = ''
  markDirty()
}

/** Called from the map page when the user adds a venue from the modal. */
function addVenueStop(venue: {
  id: number
  name: string
  lat: number | null
  lng: number | null
}) {
  if (!activeCrawl.value) {
    errorMessage.value = 'Create or open a crawl first, then add pubs.'
    return false
  }
  if (venue.id && stops.value.some((s) => s.venueId === venue.id)) {
    errorMessage.value = 'That pub is already on this crawl.'
    return false
  }
  stops.value.push({
    venueId: venue.id || null,
    venueName: venue.name,
    latitude: venue.lat,
    longitude: venue.lng,
  })
  markDirty()
  errorMessage.value = ''
  return true
}

function removeStop(index: number) {
  stops.value.splice(index, 1)
  if (currentStopIndex.value >= stops.value.length) {
    currentStopIndex.value = Math.max(0, stops.value.length - 1)
  }
  markDirty()
}

function setProgress(index: number) {
  if (index < 0 || index >= stops.value.length) return
  currentStopIndex.value = index
  markDirty()
}

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  dragIndex.value = null
  dropIndex.value = null
}

function onDragOver(index: number) {
  dropIndex.value = index
}

function onDragLeave(index: number) {
  if (dropIndex.value === index) dropIndex.value = null
}

function onDrop(toIndex: number) {
  const fromIndex = dragIndex.value
  dragIndex.value = null
  dropIndex.value = null
  if (fromIndex == null || fromIndex === toIndex) return

  const next = stops.value.slice()
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  stops.value = next

  // Keep "you are here" attached to the same stop after reorder
  if (currentStopIndex.value === fromIndex) {
    currentStopIndex.value = toIndex
  } else if (fromIndex < currentStopIndex.value && toIndex >= currentStopIndex.value) {
    currentStopIndex.value -= 1
  } else if (fromIndex > currentStopIndex.value && toIndex <= currentStopIndex.value) {
    currentStopIndex.value += 1
  }

  markDirty()
}

function formatSavedTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

defineExpose({
  addVenueStop,
  activeCrawl,
  hasActiveCrawl: computed(() => !!activeCrawl.value),
})

onMounted(async () => {
  await initializeAuth()
  if (isLoggedIn.value) await loadCrawls()
})

watch(isLoggedIn, async (loggedIn) => {
  if (loggedIn) await loadCrawls()
  else {
    crawls.value = []
    startFresh()
  }
})
</script>
