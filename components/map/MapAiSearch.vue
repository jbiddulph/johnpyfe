<template>
  <section
    id="ask"
    class="map-ai-search border-b border-primary-800/40 bg-gradient-to-r from-primary-900 via-primary-800 to-teal-900 text-white"
  >
    <div class="container mx-auto px-4 py-4 md:py-5">
      <form class="mx-auto max-w-4xl" role="search" aria-label="Ask UK Pubs" @submit.prevent="submitSearch">
        <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">Ask UK Pubs</p>
            <h2 class="text-lg font-semibold md:text-xl">Find pubs in plain English</h2>
          </div>
          <p class="text-xs text-white/70">
            {{ remainingLabel }}
          </p>
        </div>

        <div class="relative flex items-center rounded-full bg-white shadow-lg ring-1 ring-black/10">
          <label for="map-ai-search-input" class="sr-only">Ask UK Pubs</label>
          <UIcon
            name="i-heroicons-sparkles-20-solid"
            class="pointer-events-none absolute left-4 h-5 w-5 text-primary-700"
          />
          <input
            id="map-ai-search-input"
            v-model="query"
            type="search"
            autocomplete="off"
            :placeholder="placeholder"
            class="map-ai-search__input w-full rounded-full border-0 bg-transparent py-3 pl-12 pr-14 text-base text-gray-900 outline-none placeholder:text-gray-500 md:py-3.5 md:pr-16"
            :disabled="pending"
          >
          <button
            type="submit"
            class="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-pint text-stone-900 transition hover:bg-pint-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:right-2"
            :disabled="!canSearch || pending"
            :aria-label="pending ? 'Searching' : 'Search'"
          >
            <UIcon
              :name="pending ? 'i-heroicons-arrow-path-20-solid' : 'i-heroicons-magnifying-glass-20-solid'"
              class="h-5 w-5"
              :class="pending ? 'animate-spin' : ''"
            />
          </button>
        </div>
      </form>

      <div class="mx-auto mt-3 flex max-w-4xl flex-wrap gap-2">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          type="button"
          class="rounded-full bg-white/10 px-3 py-1 text-left text-xs text-white ring-1 ring-white/20 transition hover:bg-white/20"
          :disabled="pending"
          @click="runSuggestion(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>

      <p v-if="errorMessage" class="mx-auto mt-3 max-w-4xl text-sm text-amber-100">
        {{ errorMessage }}
        <button
          v-if="needsLocation"
          type="button"
          class="ml-2 underline"
          @click="$emit('request-location')"
        >
          Share location
        </button>
      </p>
      <p v-else-if="answer" class="mx-auto mt-3 max-w-4xl text-sm text-white/90">
        {{ answer }}
      </p>
    </div>

    <div v-if="pubs.length" class="border-t border-white/10 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div class="container mx-auto px-4 py-3">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-medium">
            {{ pubs.length }} pub{{ pubs.length === 1 ? '' : 's' }}
            <span v-if="crawl?.totalWalkLabel" class="font-normal text-gray-500">· {{ crawl.totalWalkLabel }}</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="!crawl"
              size="xs"
              color="amber"
              variant="soft"
              icon="i-heroicons-map-20-solid"
              label="Turn these into a pub crawl"
              :loading="ordering"
              :disabled="pubs.length < 2 || pending"
              @click="turnIntoCrawl"
            />
            <UButton
              size="xs"
              color="primary"
              :icon="isLoggedIn ? 'i-heroicons-bookmark-20-solid' : 'i-heroicons-arrow-right-on-rectangle-20-solid'"
              :label="isLoggedIn ? 'Save this crawl' : 'Log in to save & share'"
              :loading="savingCrawl"
              :disabled="!pubs.length || savingCrawl"
              @click="$emit('save-crawl', { pubs, crawl })"
            />
            <UButton
              v-if="isLoggedIn && crawl"
              size="xs"
              color="gray"
              variant="soft"
              icon="i-heroicons-user-plus-20-solid"
              label="Share"
              @click="$emit('share-crawl')"
            />
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              label="Clear"
              @click="clearResults"
            />
          </div>
        </div>

        <ul class="flex gap-3 overflow-x-auto pb-1">
          <li v-for="(pub, index) in pubs" :key="pub.id" class="w-64 shrink-0">
            <button
              type="button"
              class="flex h-28 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-400 dark:border-gray-800 dark:bg-gray-950"
              @click="$emit('select-pub', pub)"
            >
              <img
                :src="photoFor(pub)"
                :alt="pub.name"
                class="h-28 w-20 shrink-0 object-cover"
                loading="lazy"
              >
              <span class="min-w-0 flex-1 p-3">
                <span class="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">
                  {{ index + 1 }}
                </span>
                <span class="mt-1 block truncate font-semibold text-gray-900 dark:text-white">{{ pub.name }}</span>
                <span class="block truncate text-xs text-gray-500">
                  {{ [pub.town, pub.county].filter(Boolean).join(', ') }}
                </span>
                <span v-if="pub.distanceMiles != null" class="mt-1 block text-xs text-primary-700">
                  {{ formatMiles(pub.distanceMiles) }}
                </span>
                <span v-if="crawl?.legs?.[index]" class="block text-xs text-amber-800">
                  Then {{ crawl.legs[index].label }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  AI_PUB_SEARCH_LAST_KEY,
  AI_PUB_SEARCH_PLACEHOLDER,
  AI_PUB_SEARCH_SUGGESTIONS,
  type AiPubCrawl,
  type AiPubResult,
  type AiPubSearchResponse,
} from '@/utils/ai-pub-search'
import { formatDistanceMiles, resolveVenueDisplayPhotoUrl } from '@/utils/format-venue'

const props = defineProps<{
  userLat?: number | null
  userLng?: number | null
  hasLocation?: boolean
  locating?: boolean
  isLoggedIn?: boolean
  savingCrawl?: boolean
}>()

const emit = defineEmits<{
  'request-location': []
  results: [payload: AiPubSearchResponse]
  clear: []
  'select-pub': [pub: AiPubResult]
  'save-crawl': [payload: { pubs: AiPubResult[]; crawl: AiPubCrawl | null }]
  'share-crawl': []
}>()

const query = ref('')
const pending = ref(false)
const ordering = ref(false)
const errorMessage = ref('')
const answer = ref('')
const pubs = ref<AiPubResult[]>([])
const crawl = ref<AiPubCrawl | null>(null)
const remainingSearches = ref<number | null>(null)
const dailyLimit = ref<number | null>(null)
const lastResponse = ref<AiPubSearchResponse | null>(null)

const placeholder = AI_PUB_SEARCH_PLACEHOLDER
const suggestions = AI_PUB_SEARCH_SUGGESTIONS
const canSearch = computed(() => query.value.trim().length >= 6)
const needsLocation = computed(() => /near me|within \d/i.test(query.value) && !props.hasLocation)

const remainingLabel = computed(() => {
  if (remainingSearches.value == null || dailyLimit.value == null) {
    return props.isLoggedIn ? 'Signed-in searches have a higher daily limit' : 'About 8 free AI searches per day'
  }
  return `${remainingSearches.value} of ${dailyLimit.value} AI searches left today`
})

const photoConfig = computed(() => {
  const config = useRuntimeConfig()
  return {
    venueImgFolder: String(config.public.venueImgFolder || ''),
    supabaseUrl: String(config.public.supabase?.url || ''),
  }
})

function photoFor(pub: AiPubResult) {
  return resolveVenueDisplayPhotoUrl(pub.photo, photoConfig.value)
}

function formatMiles(miles: number) {
  return `${formatDistanceMiles(miles)} away`
}

function persistLast() {
  if (!import.meta.client) return
  try {
    if (!lastResponse.value) {
      sessionStorage.removeItem(AI_PUB_SEARCH_LAST_KEY)
      return
    }
    sessionStorage.setItem(AI_PUB_SEARCH_LAST_KEY, JSON.stringify({
      query: query.value,
      response: lastResponse.value,
    }))
  } catch {
    /* ignore */
  }
}

function applyResponse(response: AiPubSearchResponse, sourceQuery?: string) {
  lastResponse.value = response
  answer.value = response.answer
  pubs.value = response.pubs || []
  crawl.value = response.crawl
  remainingSearches.value = response.remainingSearches
  dailyLimit.value = response.dailyLimit
  errorMessage.value = pubs.value.length ? '' : (response.answer || 'No matching pubs found.')
  if (sourceQuery) query.value = sourceQuery
  persistLast()
  emit('results', response)
}

async function callSearch(body: Record<string, unknown>) {
  const payload = {
    ...body,
    userLat: props.userLat ?? undefined,
    userLng: props.userLng ?? undefined,
  }

  if (props.isLoggedIn) {
    try {
      return await useAuthFetch<AiPubSearchResponse>('/api/ai/pub-search', {
        method: 'POST',
        body: payload,
      })
    } catch (error: any) {
      if (error?.statusCode === 401) {
        return await $fetch<AiPubSearchResponse>('/api/ai/pub-search', {
          method: 'POST',
          body: payload,
        })
      }
      throw error
    }
  }

  return await $fetch<AiPubSearchResponse>('/api/ai/pub-search', {
    method: 'POST',
    body: payload,
  })
}

const pendingNearMe = ref(false)

async function submitSearch() {
  const question = query.value.trim()
  if (question.length < 6 || pending.value) return
  errorMessage.value = ''

  if (needsLocation.value && !props.hasLocation) {
    pendingNearMe.value = true
    emit('request-location')
    errorMessage.value = props.locating
      ? 'Finding your location…'
      : 'Share your location to search near you, then we’ll run this search.'
    return
  }

  pendingNearMe.value = false
  pending.value = true
  try {
    const response = await callSearch({ question })
    applyResponse(response, question)
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.statusMessage || error?.message || 'Search failed'
    pubs.value = []
    crawl.value = null
    answer.value = ''
  } finally {
    pending.value = false
  }
}

watch(
  () => [props.hasLocation, props.userLat, props.userLng] as const,
  ([hasLocation]) => {
    if (hasLocation && pendingNearMe.value && !pending.value) {
      void submitSearch()
    }
  },
)

async function runSuggestion(suggestion: string) {
  query.value = suggestion
  await submitSearch()
}

async function turnIntoCrawl() {
  if (pubs.value.length < 2 || ordering.value) return
  ordering.value = true
  errorMessage.value = ''
  try {
    const response = await callSearch({
      venueIds: pubs.value.map((pub) => pub.id),
      makeCrawl: true,
    })
    applyResponse(response)
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Could not order these pubs into a crawl'
  } finally {
    ordering.value = false
  }
}

function clearResults() {
  pubs.value = []
  crawl.value = null
  answer.value = ''
  errorMessage.value = ''
  lastResponse.value = null
  persistLast()
  emit('clear')
}

onMounted(() => {
  if (!import.meta.client) return
  try {
    const raw = sessionStorage.getItem(AI_PUB_SEARCH_LAST_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { query?: string; response?: AiPubSearchResponse }
    if (parsed?.response?.pubs?.length) {
      query.value = parsed.query || query.value
      applyResponse(parsed.response)
    }
  } catch {
    /* ignore */
  }
})

defineExpose({
  query,
  submitSearch,
  clearResults,
})
</script>

<style scoped>
.map-ai-search__input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none;
}
.map-ai-search__input {
  -webkit-appearance: none;
  appearance: none;
}
</style>
