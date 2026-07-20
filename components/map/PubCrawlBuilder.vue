<template>
  <div class="flex h-full flex-col">
    <div class="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Pub crawl builder</h2>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Keep multiple crawl lists, plot the route on the map, and auto check-in within 50m.
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

      <section class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Your crawl lists
            <span v-if="crawls.length" class="font-normal normal-case tracking-normal">({{ crawls.length }})</span>
          </h3>
          <div class="flex items-center gap-1">
            <UButton
              size="xs"
              color="lime"
              variant="soft"
              icon="i-heroicons-plus-20-solid"
              label="New list"
              @click="onStartFresh"
            />
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
        </div>
        <p class="text-xs text-gray-500">
          Tap a list to open it on the map. Invited lists are view-only — only the creator can edit or delete them.
        </p>

        <div v-if="loadingList && !crawls.length" class="text-sm text-gray-500">Loading…</div>
        <ul v-else-if="crawls.length" class="space-y-1">
          <li
            v-for="crawl in crawls"
            :key="crawl.id"
            class="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
            :class="crawl.id === activeCrawl?.id
              ? 'border-lime-400 bg-lime-50 dark:border-lime-700 dark:bg-lime-950/40'
              : 'border-gray-200 dark:border-gray-800'"
          >
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              @click="selectCrawl(crawl.id)"
            >
              <span class="block truncate font-medium text-gray-900 dark:text-white">
                {{ crawl.name }}
                <span
                  v-if="isOwnedCrawl(crawl)"
                  class="ml-1 text-[10px] font-semibold uppercase tracking-wide text-lime-700"
                >Yours</span>
                <span
                  v-else
                  class="ml-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700"
                >Invited</span>
              </span>
              <span class="text-xs text-gray-500">
                {{ crawl.stopCount }} stop{{ crawl.stopCount === 1 ? '' : 's' }}
                <template v-if="crawl.stopCount">
                  · at #{{ Math.min(crawl.currentStopIndex + 1, crawl.stopCount) }}
                </template>
                <template v-if="crawl.startsAt">
                  · {{ formatCrawlStartsAt(crawl.startsAt) }}
                </template>
                <template v-if="crawl.id === activeCrawl?.id"> · active</template>
              </span>
            </button>
            <UButton
              v-if="isOwnedCrawl(crawl)"
              size="xs"
              color="red"
              variant="ghost"
              icon="i-heroicons-trash-20-solid"
              aria-label="Delete crawl"
              :loading="deletingId === crawl.id"
              @click="onDeleteCrawl(crawl.id)"
            />
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No saved crawls yet. Create one below.</p>
      </section>

      <section
        v-if="creatingNewList || !activeCrawl || canEditActiveCrawl"
        class="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800"
      >
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-900 dark:text-white">
            {{ creatingNewList || !activeCrawl ? 'New crawl list name' : 'Crawl name' }}
          </label>
          <UInput
            v-model="draftName"
            class="w-full"
            placeholder="e.g. Friday night in Liverpool"
            maxlength="120"
            @keydown.enter.prevent="creatingNewList || !activeCrawl ? onCreateCrawl() : onSaveMeta()"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-900 dark:text-white">
            Start date &amp; time
          </label>
          <input
            v-model="draftStartsAt"
            type="datetime-local"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <p class="text-xs text-gray-500">Shown to everyone you invite.</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-900 dark:text-white">
            Notes for invitees
          </label>
          <UTextarea
            v-model="draftInviteeNotes"
            :rows="3"
            maxlength="2000"
            placeholder="e.g. Smart casual dress. Meet outside The Crown at 7pm. Bring ID."
          />
          <p class="text-xs text-gray-500">Dress code, meet-up tip, or anything else they should know.</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="creatingNewList || !activeCrawl"
            color="lime"
            :loading="saving"
            :disabled="!draftName.trim()"
            label="Create"
            @click="onCreateCrawl"
          />
          <UButton
            v-else
            color="lime"
            variant="soft"
            :loading="saving"
            :disabled="!draftName.trim() || !metaDirty"
            label="Save details"
            @click="onSaveMeta"
          />
        </div>
        <UButton
          v-if="creatingNewList && crawls.length"
          size="xs"
          color="gray"
          variant="link"
          label="Cancel — back to lists"
          @click="cancelNewList"
        />
      </section>
      <div
        v-else-if="activeCrawl"
        class="space-y-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm dark:border-sky-800 dark:bg-sky-950/30"
      >
        <p class="font-medium text-gray-900 dark:text-white">{{ activeCrawl.name }}</p>
        <p class="text-xs text-sky-800 dark:text-sky-200">
          Invited list — view only. You can’t rename, reorder, or delete this crawl.
        </p>
        <p v-if="activeCrawl.startsAt" class="text-sm text-gray-800 dark:text-gray-100">
          <span class="font-medium">Starts:</span> {{ formatCrawlStartsAt(activeCrawl.startsAt) }}
        </p>
        <p v-if="activeCrawl.inviteeNotes" class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">
          {{ activeCrawl.inviteeNotes }}
        </p>
      </div>

      <template v-if="activeCrawl">
        <UAlert
          v-if="!canEditActiveCrawl"
          color="sky"
          variant="soft"
          description="View only — you were invited to this crawl. Only the creator can edit or delete it."
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            size="xs"
            color="sky"
            variant="soft"
            icon="i-heroicons-chat-bubble-left-right-20-solid"
            :label="chatOpen ? 'Hide chat' : 'Crawl chat'"
            @click="chatOpen = !chatOpen"
          />
        </div>
        <CrawlChat
          v-if="chatOpen && chatUserId"
          class="h-[min(55dvh,22rem)] rounded-lg border border-gray-200 p-2.5 dark:border-gray-800 sm:h-[min(50dvh,24rem)] sm:p-3"
          :crawl-id="activeCrawl.id"
          :crawl-name="activeCrawl.name"
          :current-user-id="chatUserId"
          :active="chatOpen"
        />
        <section v-if="canEditActiveCrawl" class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Add a pub</h3>
          <p class="text-xs text-gray-500">
            Click a pub on the map and use “Add to …” / “Remove from …”, or search by name below.
          </p>
          <div class="relative">
            <UInput
              v-model="venueQuery"
              icon="i-heroicons-magnifying-glass-20-solid"
              placeholder="Search pubs by name, town, or county…"
              maxlength="200"
              autocomplete="off"
              :loading="searchLoading"
              @keydown.down.prevent="highlightNext"
              @keydown.up.prevent="highlightPrev"
              @keydown.enter.prevent="selectHighlighted"
              @keydown.esc="closeSearch"
            />
            <ul
              v-if="showSearchResults"
              class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
              role="listbox"
            >
              <li v-if="searchLoading" class="px-3 py-2 text-sm text-gray-500">Searching…</li>
              <li
                v-else-if="!searchResults.length"
                class="px-3 py-2 text-sm text-gray-500"
              >
                No pubs found. Try another name or town.
              </li>
              <li
                v-for="(venue, index) in searchResults"
                :key="venue.id"
                role="option"
                class="cursor-pointer px-3 py-2 text-sm"
                :class="index === highlightIndex
                  ? 'bg-lime-50 text-lime-950 dark:bg-lime-950/50 dark:text-lime-50'
                  : 'text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800'"
                @mousedown.prevent="selectVenue(venue)"
                @mouseenter="highlightIndex = index"
              >
                <span class="block font-medium truncate">{{ venue.venuename }}</span>
                <span class="block text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ venueLocationLabel(venue) }}
                </span>
              </li>
            </ul>
          </div>
          <p v-if="addingStop" class="text-xs text-gray-500">Adding to crawl…</p>
        </section>

        <section v-if="canEditActiveCrawl && activeCrawl" class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
            Invite to {{ activeCrawl.name }}
          </h3>
          <p class="text-xs text-gray-500">
            Search by username (3+ characters). Only the creator can invite.
          </p>
          <div class="relative">
            <UInput
              v-model="inviteQuery"
              icon="i-heroicons-magnifying-glass-20-solid"
              placeholder="Type a username…"
              autocomplete="off"
              :loading="inviteSearching"
            />
            <ul
              v-if="inviteQuery.trim().length >= 3"
              class="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <li v-if="inviteSearching" class="px-3 py-2 text-sm text-gray-500">Searching…</li>
              <template v-else-if="inviteResults.length">
                <li
                  v-for="person in inviteResults"
                  :key="person.userId"
                  class="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div class="min-w-0">
                    <p class="truncate font-medium text-gray-900 dark:text-white">@{{ person.username }}</p>
                    <p class="truncate text-xs text-gray-500">{{ person.displayName }}</p>
                  </div>
                  <UButton
                    size="xs"
                    color="lime"
                    :loading="invitingUserId === person.userId"
                    label="Invite"
                    @click="sendInvite(person)"
                  />
                </li>
              </template>
              <li v-else class="px-3 py-2 text-sm text-gray-500">
                No users found. They may need to open Pub Crawls once to create a username.
              </li>
            </ul>
          </div>
          <p v-if="inviteMessage" class="text-xs text-emerald-700 dark:text-emerald-400">{{ inviteMessage }}</p>
          <p v-if="inviteError" class="text-xs text-red-600 dark:text-red-400">{{ inviteError }}</p>
        </section>

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
                  'border-lime-400 ring-1 ring-lime-400': dragIndex === index,
                  'border-lime-300': dropIndex === index && dragIndex !== index,
                  'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30': index === currentStopIndex,
                  'border-gray-200 dark:border-gray-800': dragIndex !== index && dropIndex !== index && index !== currentStopIndex,
                }"
                :draggable="canEditActiveCrawl"
                @dragstart="canEditActiveCrawl && onDragStart(index, $event)"
                @dragend="onDragEnd"
                @dragover.prevent="canEditActiveCrawl && onDragOver(index)"
                @dragleave="onDragLeave(index)"
                @drop.prevent="canEditActiveCrawl && onDrop(index)"
              >
                <div class="flex items-start gap-2 px-2 py-2">
                  <button
                    v-if="canEditActiveCrawl"
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
                        class="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-lime-100 px-1.5 text-xs font-semibold text-lime-900 dark:bg-lime-900 dark:text-lime-100"
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
                    <p v-if="stopLocationLabel(stop)" class="text-xs text-gray-500 truncate">
                      {{ stopLocationLabel(stop) }}
                    </p>
                    <p v-else-if="!stop.venueId" class="text-xs text-lime-700 dark:text-lime-400">
                      Not linked to a venue listing
                    </p>
                  </div>
                  <div v-if="canEditActiveCrawl" class="flex shrink-0 flex-col items-end gap-1">
                    <UButton
                      size="xs"
                      color="gray"
                      variant="ghost"
                      label="Here"
                      :disabled="index === currentStopIndex"
                      @click="setProgressAndSave(index)"
                    />
                    <UButton
                      size="xs"
                      color="red"
                      variant="ghost"
                      icon="i-heroicons-x-mark-20-solid"
                      aria-label="Remove stop"
                      @click="removeStopLocal(index)"
                    />
                  </div>
                </div>
              </li>

              <li
                v-if="index < stops.length - 1"
                class="flex items-center gap-2 py-1.5 pl-8 text-xs text-gray-500"
              >
                <UIcon name="i-heroicons-arrow-long-down-20-solid" class="h-4 w-4 shrink-0 text-lime-600" />
                <span>{{ legLabel(index) }}</span>
              </li>
            </template>
          </ol>
        </section>

        <section v-if="canEditActiveCrawl" class="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-800">
          <p class="text-xs text-gray-500">
            On the map: dotted walking line + distance labels. Allow location to auto-mark arrival within 50m.
          </p>
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
                @click="setProgressAndSave(currentStopIndex - 1)"
              />
              <UButton
                size="xs"
                color="emerald"
                variant="soft"
                label="Next pub"
                :disabled="currentStopIndex >= stops.length - 1 || saving"
                @click="setProgressAndSave(currentStopIndex + 1)"
              />
            </div>
          </div>

          <UButton
            block
            color="lime"
            :loading="saving"
            :disabled="!dirty"
            label="Save order & progress"
            @click="onSaveCrawl"
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
import { formatCrawlStartsAt, toDatetimeLocalValue } from '@/utils/crawl-schedule'

const emit = defineEmits<{
  close: []
  'crawl-updated': [crawl: { id: string; name: string } | null]
}>()

const {
  crawls,
  activeCrawl,
  stops,
  currentStopIndex,
  draftName,
  draftStartsAt,
  draftInviteeNotes,
  loadingList,
  saving,
  addingStop,
  deletingId,
  errorMessage,
  dirty,
  lastSavedAt,
  totalWalkLabel,
  progressPercent,
  legLabel,
  clearActive,
  loadCrawls,
  loadCrawl,
  createCrawl,
  saveMeta,
  saveCrawl,
  deleteCrawl,
  addVenueStop,
  removeStopLocal,
  setProgressAndSave,
  reorderStops,
  canEditActiveCrawl,
  initialize,
} = usePubCrawl()

const metaDirty = computed(() => {
  if (!activeCrawl.value) return Boolean(draftName.value.trim())
  const savedStarts = toDatetimeLocalValue(activeCrawl.value.startsAt)
  const savedNotes = (activeCrawl.value.inviteeNotes || '').trim()
  return (
    draftName.value.trim() !== activeCrawl.value.name
    || draftStartsAt.value !== savedStarts
    || draftInviteeNotes.value.trim() !== savedNotes
  )
})

const { user } = useAuth()
const chatOpen = ref(false)
const chatUserId = computed(() => (user.value as { id?: string } | null)?.id || '')

type InviteProfile = { userId: string; username: string; displayName: string }

const inviteQuery = ref('')
const inviteResults = ref<InviteProfile[]>([])
const inviteSearching = ref(false)
const invitingUserId = ref<string | null>(null)
const inviteMessage = ref('')
const inviteError = ref('')
let inviteTimer: ReturnType<typeof setTimeout> | null = null

function resetInviteState() {
  inviteQuery.value = ''
  inviteResults.value = []
  inviteSearching.value = false
  invitingUserId.value = null
  inviteMessage.value = ''
  inviteError.value = ''
  if (inviteTimer) {
    clearTimeout(inviteTimer)
    inviteTimer = null
  }
}

watch(
  () => activeCrawl.value?.id,
  () => {
    chatOpen.value = false
    resetInviteState()
  },
)

watch(inviteQuery, (value) => {
  if (inviteTimer) clearTimeout(inviteTimer)
  inviteMessage.value = ''
  inviteError.value = ''
  const q = value.trim()
  if (q.length < 3) {
    inviteResults.value = []
    inviteSearching.value = false
    return
  }
  inviteSearching.value = true
  inviteTimer = setTimeout(async () => {
    try {
      inviteResults.value = await useAuthFetch<InviteProfile[]>('/api/users/search', { params: { q } })
    } catch {
      inviteResults.value = []
    } finally {
      inviteSearching.value = false
    }
  }, 250)
})

async function sendInvite(person: InviteProfile) {
  if (!activeCrawl.value?.id || !canEditActiveCrawl.value) return
  invitingUserId.value = person.userId
  inviteMessage.value = ''
  inviteError.value = ''
  try {
    await useAuthFetch(`/api/crawls/${activeCrawl.value.id}/members`, {
      method: 'POST',
      body: { userId: person.userId, username: person.username },
    })
    inviteMessage.value = `Invited @${person.username}`
    inviteQuery.value = ''
    inviteResults.value = []
  } catch (err: any) {
    inviteError.value = err?.data?.statusMessage || err?.message || 'Could not send invite'
  } finally {
    invitingUserId.value = null
  }
}

type VenueSearchHit = {
  id: number
  venuename: string
  town: string
  county: string
  latitude?: string | null
  longitude?: string | null
}

const venueQuery = ref('')
const searchResults = ref<VenueSearchHit[]>([])
const searchLoading = ref(false)
const searchOpen = ref(false)
const highlightIndex = ref(-1)
const creatingNewList = ref(false)
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchRequestId = 0

const showSearchResults = computed(() =>
  searchOpen.value && venueQuery.value.trim().length >= 2,
)

watch(
  activeCrawl,
  (crawl) => {
    emit('crawl-updated', crawl ? { id: crawl.id, name: crawl.name } : null)
  },
  { immediate: true },
)

watch(venueQuery, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  const q = value.trim()
  if (q.length < 2) {
    searchResults.value = []
    searchOpen.value = false
    highlightIndex.value = -1
    searchLoading.value = false
    return
  }
  searchOpen.value = true
  searchLoading.value = true
  searchTimer = setTimeout(() => {
    void runVenueSearch(q)
  }, 250)
})

async function runVenueSearch(q: string) {
  const requestId = ++searchRequestId
  try {
    const results = await $fetch<VenueSearchHit[]>('/api/venues/search', {
      params: { q, limit: 12 },
    })
    if (requestId !== searchRequestId) return
    searchResults.value = results
    highlightIndex.value = results.length ? 0 : -1
  } catch (err) {
    if (requestId !== searchRequestId) return
    console.error('Venue search failed:', err)
    searchResults.value = []
    highlightIndex.value = -1
  } finally {
    if (requestId === searchRequestId) searchLoading.value = false
  }
}

function venueLocationLabel(venue: VenueSearchHit) {
  return [venue.town, venue.county].filter((part) => String(part || '').trim()).join(', ')
}

function stopLocationLabel(stop: { town?: string | null; county?: string | null }) {
  return [stop.town, stop.county].filter((part) => String(part || '').trim()).join(', ')
}

function parseCoord(value: string | number | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

function closeSearch() {
  searchOpen.value = false
  highlightIndex.value = -1
}

function highlightNext() {
  if (!searchResults.value.length) return
  searchOpen.value = true
  highlightIndex.value = (highlightIndex.value + 1) % searchResults.value.length
}

function highlightPrev() {
  if (!searchResults.value.length) return
  searchOpen.value = true
  highlightIndex.value =
    highlightIndex.value <= 0 ? searchResults.value.length - 1 : highlightIndex.value - 1
}

async function selectHighlighted() {
  if (highlightIndex.value < 0 || !searchResults.value[highlightIndex.value]) return
  await selectVenue(searchResults.value[highlightIndex.value])
}

async function selectVenue(venue: VenueSearchHit) {
  const ok = await addVenueStop({
    id: venue.id,
    name: venue.venuename,
    lat: parseCoord(venue.latitude),
    lng: parseCoord(venue.longitude),
  })
  if (!ok) return
  venueQuery.value = ''
  searchResults.value = []
  searchOpen.value = false
  highlightIndex.value = -1
}

async function selectCrawl(id: string) {
  creatingNewList.value = false
  await loadCrawl(id)
}

async function onCreateCrawl() {
  const crawl = await createCrawl()
  if (crawl) creatingNewList.value = false
}

async function onSaveMeta() {
  if (!canEditActiveCrawl.value) return
  await saveMeta()
}

async function onSaveCrawl() {
  if (!canEditActiveCrawl.value) return
  await saveCrawl()
}

async function onDeleteCrawl(id: string) {
  const crawl = crawls.value.find((c) => c.id === id)
  if (!crawl || !isOwnedCrawl(crawl)) {
    errorMessage.value = 'Only the crawl creator can delete this list.'
    return
  }
  if (!confirm('Delete this pub crawl? This cannot be undone.')) return
  await deleteCrawl(id)
}

function isOwnedCrawl(crawl: { canEdit?: boolean; role?: string | null }) {
  return crawl.canEdit === true && crawl.role !== 'member'
}

function onStartFresh() {
  creatingNewList.value = true
  clearActive()
  draftName.value = ''
  draftStartsAt.value = ''
  draftInviteeNotes.value = ''
}

async function cancelNewList() {
  creatingNewList.value = false
  if (crawls.value.length) {
    await loadCrawl(crawls.value[0].id)
  }
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
  reorderStops(fromIndex, toIndex)
}

onMounted(() => {
  void initialize()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>
