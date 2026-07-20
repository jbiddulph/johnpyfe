<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="shrink-0 border-b border-gray-200 px-0.5 pb-2.5 dark:border-gray-800 sm:pb-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="truncate text-base font-semibold text-gray-900 dark:text-white">
          {{ crawlName }} chat
        </h3>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          :class="realtimeConnected
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="realtimeConnected ? 'bg-emerald-500' : 'bg-gray-400'"
          />
          {{ realtimeConnected ? 'Live' : 'Connecting' }}
        </span>
      </div>
      <p class="mt-0.5 hidden text-xs text-gray-500 sm:block">
        Only the crawl creator and accepted members can see this conversation. Messages update in real time.
      </p>
      <p class="mt-0.5 text-xs text-gray-500 sm:hidden">
        Members only · live updates
      </p>
    </div>

    <div
      ref="listEl"
      class="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain py-2.5 pr-0.5 sm:space-y-3 sm:py-3 sm:pr-1"
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
        class="rounded-lg px-2.5 py-2 text-sm sm:px-3"
        :class="message.userId === currentUserId
          ? 'ml-6 bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100 sm:ml-10'
          : 'mr-6 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 sm:mr-10'"
      >
        <div class="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[11px]">
          <span class="min-w-0 font-semibold">
            <span class="truncate">{{ message.displayName }}</span>
            <span class="font-normal text-gray-500 dark:text-gray-400"> @{{ message.username }}</span>
          </span>
          <time class="shrink-0 text-gray-500 dark:text-gray-400" :datetime="message.createdAt">
            {{ formatTime(message.createdAt) }}
          </time>
        </div>
        <p class="whitespace-pre-wrap break-words leading-5">{{ message.body }}</p>
      </div>
      <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
    </div>

    <form
      class="mt-auto flex shrink-0 gap-2 border-t border-gray-200 pt-2.5 dark:border-gray-800 sm:pt-3"
      style="padding-bottom: max(0px, env(safe-area-inset-bottom))"
      @submit.prevent="sendMessage"
    >
      <UInput
        v-model="draft"
        class="min-w-0 flex-1"
        size="md"
        maxlength="2000"
        autocomplete="off"
        enterkeyhint="send"
        placeholder="Message…"
        :disabled="sending"
      />
      <UButton
        type="submit"
        color="blue"
        size="md"
        class="shrink-0"
        :loading="sending"
        :disabled="!draft.trim()"
        icon="i-heroicons-paper-airplane-20-solid"
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

const { $supabase } = useNuxtApp()

const messages = ref<ChatMessage[]>([])
const draft = ref('')
const loading = ref(false)
const sending = ref(false)
const errorMessage = ref('')
const realtimeConnected = ref(false)
const listEl = ref<HTMLElement | null>(null)

let channel: ReturnType<typeof $supabase.channel> | null = null
let fallbackPollTimer: ReturnType<typeof setInterval> | null = null

function formatTime(iso: string) {
  try {
    const date = new Date(iso)
    const sameDay = new Date().toDateString() === date.toDateString()
    return date.toLocaleString(undefined, sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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

function appendMessage(message: ChatMessage) {
  if (!message?.id) return
  if (messages.value.some((m) => m.id === message.id)) return
  messages.value = [...messages.value, message]
  scrollToBottom()
}

async function loadMessages(options?: { silent?: boolean }) {
  if (!props.crawlId) return
  if (!options?.silent) loading.value = true
  if (!options?.silent) errorMessage.value = ''
  try {
    const after = options?.silent && messages.value.length
      ? messages.value[messages.value.length - 1].createdAt
      : null
    const data = await useAuthFetch<{ messages: ChatMessage[] }>(
      `/api/crawls/${props.crawlId}/messages`,
      {
        params: after ? { after } : {},
      },
    )
    const incoming = data.messages || []
    if (!options?.silent || !after) {
      messages.value = incoming
      scrollToBottom()
    } else if (incoming.length) {
      for (const message of incoming) appendMessage(message)
    }
  } catch (err: any) {
    if (!options?.silent) {
      const status = err?.statusCode || err?.status || err?.data?.statusCode
      if (status === 401) {
        errorMessage.value = 'Your session expired. Please sign out and sign back in, then open chat again.'
      } else {
        errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not load chat'
      }
    }
  } finally {
    loading.value = false
  }
}

async function broadcastMessage(message: ChatMessage) {
  if (!channel) return
  try {
    await channel.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: message,
    })
  } catch (err) {
    console.warn('Could not broadcast chat message', err)
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
    appendMessage(created)
    await broadcastMessage(created)
  } catch (err: any) {
    const status = err?.statusCode || err?.status || err?.data?.statusCode
    if (status === 401) {
      errorMessage.value = 'Your session expired. Please sign out and sign back in, then try again.'
    } else {
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not send message'
    }
  } finally {
    sending.value = false
  }
}

function stopFallbackPoll() {
  if (fallbackPollTimer) {
    clearInterval(fallbackPollTimer)
    fallbackPollTimer = null
  }
}

function startFallbackPoll() {
  stopFallbackPoll()
  // Safety net if a broadcast is missed
  fallbackPollTimer = setInterval(() => {
    void loadMessages({ silent: true })
  }, 12000)
}

async function stopRealtime() {
  stopFallbackPoll()
  realtimeConnected.value = false
  if (channel && $supabase) {
    try {
      await $supabase.removeChannel(channel)
    } catch {
      /* ignore */
    }
  }
  channel = null
}

async function startRealtime(crawlId: string) {
  await stopRealtime()
  if (!$supabase?.channel || !crawlId) return

  channel = $supabase
    .channel(`ukpubs-crawl-chat:${crawlId}`, {
      config: { broadcast: { self: false } },
    })
    .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      const message = payload as ChatMessage
      if (message?.crawlId && message.crawlId !== crawlId) return
      appendMessage(message)
    })
    .subscribe((status: string) => {
      realtimeConnected.value = status === 'SUBSCRIBED'
    })

  startFallbackPoll()
}

watch(
  () => [props.crawlId, props.active] as const,
  async ([id, active]) => {
    await stopRealtime()
    messages.value = []
    draft.value = ''
    if (!id || active === false) return
    await loadMessages()
    await startRealtime(id)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  void stopRealtime()
})
</script>
