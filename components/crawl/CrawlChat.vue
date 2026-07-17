<template>
  <div class="flex h-full min-h-[22rem] flex-col">
    <div class="border-b border-gray-200 px-1 pb-3 dark:border-gray-800">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">
        {{ crawlName }} chat
      </h3>
      <p class="mt-0.5 text-xs text-gray-500">
        Only the crawl creator and accepted members can see this conversation.
      </p>
    </div>

    <div
      ref="listEl"
      class="min-h-0 flex-1 space-y-3 overflow-y-auto py-3 pr-1"
    >
      <div v-if="loading && !messages.length" class="text-sm text-gray-500">
        Loading chat…
      </div>
      <p v-else-if="!messages.length" class="text-sm text-gray-500">
        No messages yet. Say hi to your crawl group.
      </p>
      <div
        v-for="message in messages"
        :key="message.id"
        class="rounded-lg px-3 py-2 text-sm"
        :class="message.userId === currentUserId
          ? 'ml-8 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'
          : 'mr-8 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'"
      >
        <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-[11px]">
          <span class="font-semibold">
            {{ message.displayName }}
            <span class="font-normal text-gray-500 dark:text-gray-400">@{{ message.username }}</span>
          </span>
          <time class="text-gray-500 dark:text-gray-400" :datetime="message.createdAt">
            {{ formatTime(message.createdAt) }}
          </time>
        </div>
        <p class="whitespace-pre-wrap break-words leading-5">{{ message.body }}</p>
      </div>
      <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
    </div>

    <form class="mt-auto flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-800" @submit.prevent="sendMessage">
      <UInput
        v-model="draft"
        class="flex-1"
        maxlength="2000"
        autocomplete="off"
        placeholder="Write a message…"
        :disabled="sending"
      />
      <UButton
        type="submit"
        color="amber"
        :loading="sending"
        :disabled="!draft.trim()"
        label="Send"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
type ChatMessage = {
  id: string
  crawlId: string
  userId: string
  body: string
  createdAt: string
  username: string
  displayName: string
}

const props = defineProps<{
  crawlId: string
  crawlName: string
  currentUserId: string
  active?: boolean
}>()

const messages = ref<ChatMessage[]>([])
const draft = ref('')
const loading = ref(false)
const sending = ref(false)
const errorMessage = ref('')
const listEl = ref<HTMLElement | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function scrollToBottom() {
  nextTick(() => {
    const el = listEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function loadMessages(options?: { silent?: boolean }) {
  if (!props.crawlId) return
  if (!options?.silent) loading.value = true
  errorMessage.value = ''
  try {
    const after = messages.value.length
      ? messages.value[messages.value.length - 1].createdAt
      : null
    const data = await useAuthFetch<{ messages: ChatMessage[] }>(
      `/api/crawls/${props.crawlId}/messages`,
      {
        params: after && options?.silent ? { after } : {},
      },
    )
    const incoming = data.messages || []
    if (!options?.silent || !after) {
      messages.value = incoming
    } else if (incoming.length) {
      const seen = new Set(messages.value.map((m) => m.id))
      const fresh = incoming.filter((m) => !seen.has(m.id))
      if (fresh.length) {
        messages.value = [...messages.value, ...fresh]
        scrollToBottom()
      }
    }
    if (!options?.silent) scrollToBottom()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not load chat'
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  const body = draft.value.trim()
  if (!body || sending.value) return
  sending.value = true
  errorMessage.value = ''
  try {
    const created = await useAuthFetch<ChatMessage>(`/api/crawls/${props.crawlId}/messages`, {
      method: 'POST',
      body: { body },
    })
    draft.value = ''
    if (!messages.value.some((m) => m.id === created.id)) {
      messages.value = [...messages.value, created]
    }
    scrollToBottom()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not send message'
  } finally {
    sending.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    void loadMessages({ silent: true })
  }, 4000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  () => [props.crawlId, props.active] as const,
  async ([id, active]) => {
    stopPolling()
    messages.value = []
    draft.value = ''
    if (!id || active === false) return
    await loadMessages()
    startPolling()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopPolling()
})
</script>
