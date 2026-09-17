<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />

    <h1 class="text-4xl font-bold mb-3">Ask UK Pubs</h1>
    <p class="mb-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
      Ask about pubs, towns, upcoming events, or what’s near a stadium. We’ll look up live listings and answer in plain English.
    </p>

    <AiPromptBox
      class="mb-4"
      variant="page"
      input-id="ask-page-input"
      initial-mode="ask"
      :initial-query="query"
      :pending="pending || followUpPending"
      @submit="onPromptSubmit"
    />

    <ul v-if="!activeQuery" class="mb-8 flex flex-wrap gap-2 list-none p-0 m-0">
      <li v-for="example in examples" :key="example">
        <UButton
          color="gray"
          variant="soft"
          size="xs"
          :label="example"
          @click="askExample(example)"
        />
      </li>
    </ul>

    <p v-if="loadError" class="text-red-600 mb-6">{{ loadError }}</p>

    <p v-else-if="pending && activeQuery" class="text-gray-600 mb-6">
      Looking up “{{ activeQuery }}”…
    </p>

    <template v-else-if="displayResult">
      <AiAnswerCard
        :answer="displayResult.answer"
        :links="displayResult.links"
        :fallback="displayResult.fallback"
      />

      <form class="mt-8 max-w-3xl" @submit.prevent="submitFollowUp">
        <label for="ask-followup-input" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ask a follow-up
        </label>
        <div class="flex flex-col gap-3 sm:flex-row">
          <UInput
            id="ask-followup-input"
            v-model="followUp"
            class="flex-1"
            size="lg"
            placeholder="Narrow it down — e.g. with a beer garden"
            :disabled="followUpPending"
          />
          <UButton
            type="submit"
            color="primary"
            :loading="followUpPending"
            :disabled="followUp.trim().length < 3"
            label="Ask"
          />
        </div>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  AI_PROMPT_EXAMPLES,
  AI_PROMPT_MIN_LENGTH,
  type AiPromptHistoryItem,
  type AiPromptResponse,
} from '@/types/ai-prompt'

const route = useRoute()
const router = useRouter()
const requestFetch = useRequestFetch()

const query = ref('')
const activeQuery = ref('')
const followUp = ref('')
const followUpPending = ref(false)
const followUpError = ref('')
const conversation = ref<AiPromptHistoryItem[]>([])
const displayResult = ref<AiPromptResponse | null>(null)
const examples = AI_PROMPT_EXAMPLES

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Ask' },
]

const { data: result, pending, error } = await useAsyncData(
  'ai-prompt-ask',
  async () => {
    if (activeQuery.value.length < AI_PROMPT_MIN_LENGTH) return null
    conversation.value = [{ role: 'user', content: activeQuery.value }]
    followUpError.value = ''
    return requestFetch<AiPromptResponse>('/api/ai/prompt', {
      method: 'POST',
      body: { prompt: activeQuery.value },
    })
  },
  { watch: [activeQuery], server: false },
)

watch(result, (value) => {
  displayResult.value = value
  if (value?.answer && conversation.value.at(-1)?.role !== 'assistant') {
    conversation.value.push({ role: 'assistant', content: value.answer })
  }
}, { immediate: true })

const loadError = computed(() => {
  if (followUpError.value) return followUpError.value
  if (!error.value) return ''
  const status = Number((error.value as { statusCode?: number }).statusCode || 0)
  if (status === 429) return 'Too many questions just now. Please wait a minute and try again.'
  return 'Could not answer just now. Please try again.'
})

function syncFromRoute() {
  const q = String(route.query.q || '').trim()
  query.value = q
  activeQuery.value = q
  followUp.value = ''
  followUpError.value = ''
  if (!q) {
    displayResult.value = null
    conversation.value = []
  }
}

function goToAsk(q: string) {
  router.push({ path: '/ask', query: { q } })
}

function onPromptSubmit(payload: { mode: 'search' | 'ask'; query: string }) {
  if (payload.mode === 'search') {
    navigateTo({ path: '/search', query: { q: payload.query } })
    return
  }
  goToAsk(payload.query)
}

function askExample(example: string) {
  goToAsk(example)
}

async function submitFollowUp() {
  const next = followUp.value.trim()
  if (next.length < AI_PROMPT_MIN_LENGTH || followUpPending.value || !displayResult.value) return

  followUpPending.value = true
  followUpError.value = ''
  try {
    const history = conversation.value.slice(-6)
    const response = await requestFetch<AiPromptResponse>('/api/ai/prompt', {
      method: 'POST',
      body: { prompt: next, history },
    })
    conversation.value.push({ role: 'user', content: next }, { role: 'assistant', content: response.answer })
    displayResult.value = response
    followUp.value = ''
    query.value = next
  } catch (err) {
    const status = Number((err as { statusCode?: number })?.statusCode || 0)
    followUpError.value = status === 429
      ? 'Too many questions just now. Please wait a minute and try again.'
      : 'Could not answer just now. Please try again.'
  } finally {
    followUpPending.value = false
  }
}

watch(
  () => route.query.q,
  () => {
    syncFromRoute()
  },
  { immediate: true },
)

useSiteSeo(() => ({
  title: activeQuery.value ? `Ask UK Pubs: ${activeQuery.value}` : 'Ask UK Pubs',
  description:
    'Ask anything about UK pubs, towns, events and stadium neighbourhoods. Answers are backed by live listings on UK Pubs.',
  path: '/ask',
}))

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>
