<template>
  <form
    class="ai-prompt-box w-full max-w-3xl"
    :class="{ 'ai-prompt-box--hero': variant === 'hero' }"
    :role="mode === 'search' ? 'search' : undefined"
    :aria-label="formLabel"
    @submit.prevent="submit"
  >
    <div
      v-if="allowToggle"
      class="mb-3 flex justify-center"
    >
      <div
        class="ai-prompt-box__tabs rounded-full p-1.5"
        :class="variant === 'hero' ? 'bg-black/70 ring-1 ring-white/50 backdrop-blur-sm' : 'bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700'"
        role="tablist"
        aria-label="Search or ask"
      >
        <button
          type="button"
          role="tab"
          class="ai-prompt-box__tab rounded-full px-5 py-2 text-sm font-semibold transition"
          :class="tabClass('search')"
          :aria-selected="mode === 'search'"
          @click="mode = 'search'"
        >
          Find a pub
        </button>
        <button
          type="button"
          role="tab"
          class="ai-prompt-box__tab rounded-full px-5 py-2 text-sm font-semibold transition"
          :aria-selected="mode === 'ask'"
          @click="mode = 'ask'"
        >
          Ask anything
        </button>
      </div>
    </div>

    <div
      class="relative flex items-center rounded-full bg-white shadow-2xl ring-1"
      :class="variant === 'hero' ? 'ring-black/5' : 'shadow-md ring-gray-200 dark:bg-gray-900 dark:ring-gray-700'"
    >
      <label :for="inputId" class="sr-only">{{ formLabel }}</label>
      <input
        :id="inputId"
        v-model="query"
        :type="mode === 'search' ? 'search' : 'text'"
        autocomplete="off"
        :placeholder="placeholder"
        :maxlength="mode === 'ask' ? 500 : 200"
        class="ai-prompt-box__input w-full rounded-full border-0 bg-transparent py-4 pl-5 pr-14 text-base text-gray-900 outline-none placeholder:text-gray-500 dark:text-white md:py-5 md:pl-7 md:pr-16 md:text-lg"
      />
      <button
        type="submit"
        class="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-pint text-stone-900 transition hover:bg-pint-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:right-3 md:h-11 md:w-11"
        :disabled="!canSubmit || pending"
        :aria-label="mode === 'ask' ? 'Ask' : 'Search'"
      >
        <UIcon
          :name="pending ? 'i-heroicons-arrow-path-20-solid' : (mode === 'ask' ? 'i-heroicons-sparkles-20-solid' : 'i-heroicons-magnifying-glass-20-solid')"
          class="h-5 w-5 md:h-6 md:w-6"
          :class="{ 'animate-spin': pending }"
        />
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { AI_PROMPT_MIN_LENGTH } from '@/types/ai-prompt'

const props = withDefaults(defineProps<{
  variant?: 'hero' | 'page'
  allowToggle?: boolean
  initialMode?: 'search' | 'ask'
  initialQuery?: string
  pending?: boolean
  inputId?: string
}>(), {
  variant: 'page',
  allowToggle: false,
  initialMode: 'search',
  initialQuery: '',
  pending: false,
  inputId: 'ai-prompt-input',
})

const emit = defineEmits<{
  submit: [payload: { mode: 'search' | 'ask'; query: string }]
}>()

const mode = defineModel<'search' | 'ask'>('mode', { default: 'search' })
const query = ref(props.initialQuery)

if (props.initialMode) {
  mode.value = props.initialMode
}

watch(
  () => props.initialQuery,
  (value) => {
    query.value = value
  },
)

watch(
  () => props.initialMode,
  (value) => {
    mode.value = value
  },
)

const minLength = computed(() => (mode.value === 'ask' ? AI_PROMPT_MIN_LENGTH : 2))
const canSubmit = computed(() => query.value.trim().length >= minLength.value)

const formLabel = computed(() =>
  mode.value === 'ask' ? 'Ask UK Pubs anything' : 'Search pubs and venues',
)

const placeholder = computed(() =>
  mode.value === 'ask'
    ? 'Ask anything — dog-friendly in York, gigs in Brighton…'
    : 'Search by pub or venue name, town, or county…',
)

function tabClass(tab: 'search' | 'ask') {
  const active = mode.value === tab
  if (props.variant === 'hero') {
    return active
      ? 'bg-pint text-stone-900 shadow-sm'
      : 'text-white/80 hover:text-white'
  }
  return active
    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'
}

function submit() {
  const q = query.value.trim()
  if (q.length < minLength.value || props.pending) return
  emit('submit', { mode: mode.value, query: q })
}

defineExpose({
  reset: () => {
    query.value = ''
  },
})
</script>

<style scoped>
.ai-prompt-box__input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.ai-prompt-box__input {
  -webkit-appearance: none;
  appearance: none;
}

.ai-prompt-box__tabs {
  display: flex;
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.25rem;
}

.ai-prompt-box__tab {
  width: auto !important;
  flex: 0 0 auto;
  white-space: nowrap;
}

.ai-prompt-box--hero .ai-prompt-box__tab[aria-selected='true'] {
  background-color: #f5b301;
  color: #1c1917;
}

.ai-prompt-box--hero .ai-prompt-box__tab[aria-selected='false'] {
  color: rgba(255, 255, 255, 0.92);
}
</style>
