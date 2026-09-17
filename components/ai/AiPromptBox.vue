<template>
  <div class="ai-prompt">
    <form
      class="ai-prompt__form"
      @submit.prevent="submitPrompt()"
    >
      <label for="ai-prompt-input" class="sr-only">Ask anything about UK pubs</label>
      <textarea
        id="ai-prompt-input"
        ref="inputEl"
        v-model="draft"
        rows="3"
        maxlength="1200"
        :disabled="pending"
        placeholder="Ask anything — dog-friendly pubs in Brighton, gigs in Manchester, pubs near Old Trafford…"
        class="ai-prompt__input"
        @keydown.enter.exact.prevent="submitPrompt()"
      />
      <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ draft.length }}/1200 · Enter to send, Shift+Enter for a new line
        </p>
        <UButton
          type="submit"
          color="primary"
          class="self-start sm:self-auto"
          :loading="pending"
          :disabled="!canSubmit"
          icon="i-heroicons-sparkles-20-solid"
        >
          {{ pending ? 'Looking up listings…' : 'Ask' }}
        </UButton>
      </div>
    </form>

    <div v-if="!turns.length && !pending" class="mt-5 flex flex-wrap gap-2">
      <button
        v-for="example in examples"
        :key="example"
        type="button"
        class="rounded-full border border-primary-200 bg-white px-3 py-1.5 text-sm text-primary-800 transition hover:border-primary-400 hover:bg-primary-50 dark:border-primary-800 dark:bg-gray-900 dark:text-primary-200 dark:hover:bg-primary-950"
        @click="submitPrompt(example)"
      >
        {{ example }}
      </button>
    </div>

    <p v-if="errorMessage" class="mt-4 text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <ol v-if="turns.length" class="mt-8 space-y-6">
      <li v-for="(turn, index) in turns" :key="index" class="space-y-3">
        <div class="rounded-2xl bg-primary-950 px-4 py-3 text-white dark:bg-primary-900">
          <p class="text-xs font-semibold uppercase tracking-wide text-pint">You asked</p>
          <p class="mt-1 whitespace-pre-wrap text-base">{{ turn.prompt }}</p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">Answer</p>
          <p v-if="!turn.response && pending && index === turns.length - 1" class="mt-2 text-gray-600 dark:text-gray-300">
            Looking up listings…
          </p>
          <div v-else class="mt-2 space-y-3 text-gray-800 dark:text-gray-100">
            <p v-for="(paragraph, pIndex) in turn.paragraphs" :key="pIndex" class="whitespace-pre-wrap">
              {{ paragraph }}
            </p>
          </div>
          <p
            v-if="turn.response?.toolsCalled?.length"
            class="mt-3 text-xs text-gray-500 dark:text-gray-400"
          >
            Looked up {{ toolSummary(turn.response.toolsCalled) }}
          </p>
        </div>

        <div v-if="turn.response?.places?.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="place in turn.response.places"
            :key="place.href"
            :to="place.href"
            class="hub-card flex items-center justify-between gap-3"
          >
            <span class="hub-card__title">{{ place.name }}</span>
            <span class="hub-card__meta shrink-0">
              {{ place.kind }}
              <template v-if="place.venueCount"> · {{ place.venueCount }} {{ place.venueCount === 1 ? 'pub' : 'pubs' }}</template>
            </span>
          </NuxtLink>
        </div>

        <ul v-if="turn.response?.venues?.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <li v-for="venue in turn.response.venues" :key="venue.id">
            <NuxtLink
              :to="venue.href"
              class="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <p class="font-semibold text-gray-900 dark:text-white">{{ venue.venuename }}</p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {{ [venue.address, venue.town, venue.postcode].filter(Boolean).join(', ') }}
              </p>
              <p v-if="venue.featuresPreview" class="mt-2 line-clamp-2 text-xs text-gray-500">
                {{ venue.featuresPreview }}
              </p>
            </NuxtLink>
          </li>
        </ul>

        <ul v-if="turn.response?.events?.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <li v-for="item in turn.response.events" :key="item.id">
            <NuxtLink
              :to="item.href"
              class="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <p class="font-semibold text-gray-900 dark:text-white">{{ item.title }}</p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {{ item.category }} at {{ item.venueName }} · {{ item.town }}
              </p>
              <p class="mt-1 text-xs text-amber-700 dark:text-amber-400">{{ formatEventDate(item.startsAt) }}</p>
            </NuxtLink>
          </li>
        </ul>

        <ul v-if="turn.response?.news?.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <li v-for="article in turn.response.news" :key="article.slug">
            <NuxtLink
              :to="article.href"
              class="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-amber-300 dark:border-gray-700 dark:bg-gray-900"
            >
              <p class="font-semibold text-gray-900 dark:text-white">{{ article.title }}</p>
              <p class="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{{ article.excerpt }}</p>
            </NuxtLink>
          </li>
        </ul>

        <ul v-if="turn.response?.stadiums?.length" class="flex flex-wrap gap-2">
          <li v-for="stadium in turn.response.stadiums" :key="stadium.href">
            <NuxtLink
              :to="stadium.href"
              class="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
            >
              Pubs near {{ stadium.stadiumName }}
            </NuxtLink>
          </li>
        </ul>

        <div v-if="turn.response?.suggestedQueries?.length && index === turns.length - 1" class="flex flex-wrap gap-2">
          <button
            v-for="suggestion in turn.response.suggestedQueries"
            :key="suggestion"
            type="button"
            class="rounded-full border border-gray-200 bg-surface px-3 py-1.5 text-sm text-gray-700 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            @click="submitPrompt(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import type { AiPromptHistoryMessage, AiPromptResponse } from '~/types/ai-prompt'

const props = defineProps<{
  initialPrompt?: string
  autoSubmit?: boolean
}>()

const examples = [
  'Dog-friendly pubs in Brighton',
  "What's on in Manchester this weekend?",
  'Pubs near Old Trafford',
  'Latest pub news',
]

const TOOL_LABELS: Record<string, string> = {
  search_venues: 'pub listings',
  get_venue: 'a pub listing',
  search_events: 'upcoming events',
  search_places: 'towns and counties',
  search_news: 'news articles',
  find_nearby_pubs: 'nearby pubs',
  search_stadiums: 'stadiums',
  get_site_overview: 'site totals',
}

type PromptTurn = {
  prompt: string
  paragraphs: string[]
  response: AiPromptResponse | null
}

const draft = ref('')
const pending = ref(false)
const errorMessage = ref('')
const turns = ref<PromptTurn[]>([])
const inputEl = ref<HTMLTextAreaElement | null>(null)
const didAutoSubmit = ref(false)

const canSubmit = computed(() => draft.value.trim().length >= 2 && !pending.value)

function paragraphsFrom(answer: string) {
  return answer
    .split(/\n{2,}|\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function toolSummary(tools: string[]) {
  const labels = [...new Set(tools.map((name) => TOOL_LABELS[name] || name))]
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

function formatEventDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function historyPayload(): AiPromptHistoryMessage[] {
  const messages: AiPromptHistoryMessage[] = []
  for (const turn of turns.value.slice(-6)) {
    messages.push({ role: 'user', content: turn.prompt })
    const answer = turn.response?.answer
    if (answer) messages.push({ role: 'assistant', content: answer })
  }
  return messages
}

async function submitPrompt(value?: string) {
  const prompt = (value ?? draft.value).trim()
  if (prompt.length < 2 || pending.value) return

  draft.value = ''
  errorMessage.value = ''
  pending.value = true
  turns.value.push({ prompt, paragraphs: [], response: null })

  try {
    const response = await $fetch<AiPromptResponse>('/api/ai/prompt', {
      method: 'POST',
      body: {
        prompt,
        history: historyPayload().slice(0, -1),
      },
    })
    const last = turns.value[turns.value.length - 1]
    if (last) {
      last.response = response
      last.paragraphs = paragraphsFrom(response.answer)
    }
  } catch (error: any) {
    errorMessage.value =
      error?.statusMessage
      || error?.data?.statusMessage
      || error?.message
      || 'The assistant could not answer just now. Please try again.'
    if (!turns.value[turns.value.length - 1]?.response) {
      turns.value.pop()
      draft.value = prompt
    }
  } finally {
    pending.value = false
    await nextTick()
    inputEl.value?.focus()
  }
}

watch(
  () => props.initialPrompt,
  (value) => {
    if (value && !draft.value) draft.value = value
  },
  { immediate: true },
)

onMounted(async () => {
  if (props.autoSubmit && props.initialPrompt && !didAutoSubmit.value) {
    didAutoSubmit.value = true
    await submitPrompt(props.initialPrompt)
  }
})
</script>

<style scoped>
.ai-prompt__input {
  width: 100%;
  resize: vertical;
  min-height: 5.5rem;
  border-radius: 1rem;
  border: 1px solid rgb(231 229 228);
  background: white;
  padding: 0.9rem 1rem;
  font-size: 1rem;
  line-height: 1.5;
  color: #1c1917;
  outline: none;
}

.ai-prompt__input:focus {
  border-color: #0E8579;
  box-shadow: 0 0 0 3px rgba(14, 133, 121, 0.18);
}

.dark .ai-prompt__input {
  border-color: rgb(55 65 81);
  background: rgb(17 24 39);
  color: white;
}
</style>
