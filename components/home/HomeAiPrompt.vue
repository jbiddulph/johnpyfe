<template>
  <section
    id="ask-uk-pubs"
    class="home-band border-y border-primary-100 bg-gradient-to-b from-primary-50/80 to-white dark:border-gray-800 dark:from-gray-950 dark:to-gray-900"
    aria-labelledby="ask-uk-pubs-heading"
  >
    <div class="container mx-auto px-4 py-14">
      <div class="mx-auto max-w-3xl">
        <p class="text-sm font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
          Ask UK Pubs
        </p>
        <h2 id="ask-uk-pubs-heading" class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          Ask anything pub related
        </h2>
        <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Dog-friendly locals, match-day pubs, quizzes, what’s on this weekend — answers from our live UK listings.
        </p>

        <form class="mt-8" @submit.prevent="submitQuestion">
          <label for="home-ai-prompt" class="sr-only">Ask a pub-related question</label>
          <div class="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
            <textarea
              id="home-ai-prompt"
              v-model="draft"
              rows="3"
              maxlength="500"
              :disabled="asking"
              autocomplete="off"
              placeholder="e.g. Dog-friendly pubs in Brighton with a beer garden"
              class="block w-full resize-y rounded-t-2xl border-0 bg-transparent px-5 py-4 text-base text-gray-900 outline-none placeholder:text-gray-500 disabled:opacity-60 dark:text-white md:px-6 md:text-lg"
              @keydown.enter.exact.prevent="submitQuestion"
            />
            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition"
                  :class="location
                    ? 'bg-primary-50 text-primary-800 ring-primary-200 dark:bg-primary-950 dark:text-primary-100 dark:ring-primary-800'
                    : 'text-gray-600 ring-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800'"
                  :aria-pressed="Boolean(location)"
                  @click="toggleLocation"
                >
                  <UIcon name="i-heroicons-map-pin-20-solid" class="h-4 w-4" aria-hidden="true" />
                  {{ location ? 'Using your location' : 'Use my location' }}
                </button>
                <span class="text-xs text-gray-400">{{ draft.length }}/500</span>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  v-if="turns.length"
                  type="button"
                  color="gray"
                  variant="ghost"
                  size="sm"
                  :disabled="asking"
                  @click="resetConversation"
                >
                  New question
                </UButton>
                <UButton
                  type="submit"
                  color="primary"
                  size="md"
                  icon="i-heroicons-sparkles-20-solid"
                  :loading="asking"
                  :disabled="!canAsk"
                >
                  Ask
                </UButton>
              </div>
            </div>
          </div>
        </form>

        <p v-if="locationError" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ locationError }}</p>

        <ul v-if="!turns.length" class="mt-5 flex flex-wrap gap-2" aria-label="Example questions">
          <li v-for="example in examples" :key="example">
            <button
              type="button"
              class="rounded-full bg-white px-3 py-1.5 text-sm text-gray-700 ring-1 ring-gray-200 transition hover:border-primary-300 hover:text-primary-800 hover:ring-primary-300 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700 dark:hover:ring-primary-500"
              :disabled="asking"
              @click="useExample(example)"
            >
              {{ example }}
            </button>
          </li>
        </ul>

        <div
          v-if="turns.length || asking"
          class="mt-8 space-y-4"
          aria-live="polite"
          :aria-busy="asking"
        >
          <article
            v-for="(turn, index) in turns"
            :key="`${turn.role}-${index}`"
            class="rounded-xl px-4 py-3 text-sm leading-6 md:text-base"
            :class="turn.role === 'user'
              ? 'ml-6 bg-primary-700 text-white dark:bg-primary-800'
              : 'mr-6 bg-white text-gray-800 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-800'"
          >
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
              {{ turn.role === 'user' ? 'You' : 'UK Pubs AI' }}
            </p>
            <p v-if="turn.role === 'user'" class="whitespace-pre-wrap break-words">{{ turn.content }}</p>
            <div v-else class="space-y-3">
              <p
                v-for="(paragraph, pIndex) in paragraphs(turn.content)"
                :key="pIndex"
                class="whitespace-pre-wrap break-words"
              >
                <template v-for="(segment, sIndex) in answerSegments(paragraph)" :key="sIndex">
                  <NuxtLink
                    v-if="segment.type === 'link'"
                    :to="segment.href"
                    class="font-semibold text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-600 dark:text-primary-300"
                  >
                    {{ segment.label }}
                  </NuxtLink>
                  <template v-else>{{ segment.value }}</template>
                </template>
              </p>
              <ul v-if="turn.links?.length" class="flex flex-wrap gap-2 pt-1">
                <li v-for="link in turn.links" :key="link.href">
                  <NuxtLink
                    :to="link.href"
                    class="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800 ring-1 ring-primary-100 hover:bg-primary-100 dark:bg-primary-950 dark:text-primary-100 dark:ring-primary-800"
                  >
                    {{ link.label }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </article>

          <p v-if="asking" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <UIcon name="i-heroicons-sparkles-20-solid" class="h-4 w-4 animate-pulse" aria-hidden="true" />
            Looking up listings…
          </p>
          <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PubAssistantHistoryItem, PubAssistantLink, PubAssistantReply } from '~/types/pub-assistant'

type Turn = {
  role: 'user' | 'assistant'
  content: string
  links?: PubAssistantLink[]
}

type AnswerSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string }

const examples = [
  'Dog-friendly pubs in Brighton',
  'What’s on in Manchester this weekend?',
  'Pubs near the Emirates Stadium',
  'Real ale pubs in York',
  'Latest pub news',
]

const LINK_RE = /\[([^\]]+)\]\((\/[^)\s]+)\)/g

const draft = ref('')
const asking = ref(false)
const errorMessage = ref('')
const locationError = ref('')
const turns = ref<Turn[]>([])
const location = ref<{ latitude: number; longitude: number } | null>(null)

const canAsk = computed(() => draft.value.trim().length >= 3 && !asking.value)

function paragraphs(text: string) {
  return text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
}

function answerSegments(text: string): AnswerSegment[] {
  const segments: AnswerSegment[] = []
  let lastIndex = 0
  for (const match of text.matchAll(LINK_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) })
    }
    const href = match[2]
    if (href.startsWith('/') && !href.startsWith('//')) {
      segments.push({ type: 'link', label: match[1], href })
    } else {
      segments.push({ type: 'text', value: match[0] })
    }
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

function resetConversation() {
  turns.value = []
  errorMessage.value = ''
  draft.value = ''
}

function useExample(example: string) {
  draft.value = example
  submitQuestion()
}

function toggleLocation() {
  locationError.value = ''
  if (location.value) {
    location.value = null
    return
  }
  if (!import.meta.client || !navigator.geolocation) {
    locationError.value = 'Location is not available in this browser.'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      location.value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
    },
    () => {
      locationError.value = 'Could not read your location. You can still ask by town or pub name.'
    },
    { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
  )
}

function historyPayload(): PubAssistantHistoryItem[] {
  return turns.value.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }))
}

function fetchErrorMessage(error: unknown) {
  const err = error as { data?: { message?: string }; statusMessage?: string; message?: string }
  return err?.data?.message || err?.statusMessage || err?.message || 'Something went wrong. Please try again.'
}

async function submitQuestion() {
  const question = draft.value.trim()
  if (question.length < 3 || asking.value) return

  asking.value = true
  errorMessage.value = ''
  turns.value = [...turns.value, { role: 'user', content: question }]
  draft.value = ''

  try {
    const reply = await $fetch<PubAssistantReply>('/api/ai/ask', {
      method: 'POST',
      body: {
        question,
        history: historyPayload().slice(0, -1),
        latitude: location.value?.latitude,
        longitude: location.value?.longitude,
      },
    })
    turns.value = [
      ...turns.value,
      {
        role: 'assistant',
        content: reply.answer,
        links: reply.links,
      },
    ]
  } catch (error) {
    errorMessage.value = fetchErrorMessage(error)
  } finally {
    asking.value = false
  }
}
</script>
