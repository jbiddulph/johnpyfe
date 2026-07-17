<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Pub Crawls</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Your active crawl, invites, and shared lists.
          <span v-if="profile">Signed in as <strong>@{{ profile.username }}</strong></span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton color="amber" to="/map" label="Open map builder" />
        <UButton color="gray" variant="soft" :loading="loading" label="Refresh" @click="loadDashboard" />
      </div>
    </div>

    <UAlert
      v-if="errorMessage"
      class="mb-4"
      color="red"
      variant="soft"
      :description="errorMessage"
      :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'red', variant: 'link' }"
      @close="errorMessage = ''"
    />

    <div v-if="loading && !loaded" class="text-sm text-gray-500">Loading pub crawls…</div>

    <template v-else>
      <!-- Notifications -->
      <section v-if="notifications.length" class="mb-8 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Notifications
            <span v-if="unreadNotificationCount" class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
              {{ unreadNotificationCount }} new
            </span>
          </h2>
          <UButton
            v-if="unreadNotificationCount"
            size="xs"
            color="gray"
            variant="link"
            label="Mark all read"
            @click="markNotificationsRead"
          />
        </div>
        <ul class="space-y-2">
          <li
            v-for="note in notifications.slice(0, 8)"
            :key="note.id"
            class="rounded-md border px-3 py-2 text-sm"
            :class="note.readAt
              ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
              : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'"
          >
            <p class="font-medium text-gray-900 dark:text-white">{{ note.title }}</p>
            <p v-if="note.body" class="text-gray-600 dark:text-gray-400">{{ note.body }}</p>
          </li>
        </ul>
      </section>

      <!-- Pending invites -->
      <section v-if="pendingInvites.length" class="mb-8 space-y-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Invitations</h2>
        <UCard
          v-for="invite in pendingInvites"
          :key="invite.id"
          :ui="{ body: { padding: 'p-4' } }"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ invite.crawlName }}</p>
              <p class="text-sm text-gray-500">
                Invited by @{{ invite.invitedBy.username }}
                · {{ invite.stopCount }} stop{{ invite.stopCount === 1 ? '' : 's' }}
              </p>
            </div>
            <div class="flex gap-2">
              <UButton
                color="emerald"
                size="sm"
                :loading="respondingId === invite.id"
                label="Accept"
                @click="respondInvite(invite.id, 'accept')"
              />
              <UButton
                color="gray"
                variant="soft"
                size="sm"
                :loading="respondingId === invite.id"
                label="Decline"
                @click="respondInvite(invite.id, 'decline')"
              />
            </div>
          </div>
        </UCard>
      </section>

      <!-- Active -->
      <section class="mb-8 space-y-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Current active crawl</h2>
        <CrawlDashboardCard
          v-if="activeCrawl"
          :crawl="activeCrawl"
          accent="emerald"
          @invite="openInvite(activeCrawl)"
          @complete="toggleComplete(activeCrawl, true)"
          @reopen="toggleComplete(activeCrawl, false)"
          @deleted="loadDashboard"
        />
        <p v-else class="text-sm text-gray-500">
          No active crawl.
          <NuxtLink to="/map" class="text-amber-700 hover:underline">Create one on the map</NuxtLink>
          or accept an invite above.
        </p>
      </section>

      <!-- Other -->
      <section class="mb-8 space-y-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Other crawls</h2>
        <div v-if="otherCrawls.length" class="space-y-3">
          <CrawlDashboardCard
            v-for="crawl in otherCrawls"
            :key="crawl.id"
            :crawl="crawl"
            @invite="openInvite(crawl)"
            @complete="toggleComplete(crawl, true)"
            @reopen="toggleComplete(crawl, false)"
            @deleted="loadDashboard"
          />
        </div>
        <p v-else class="text-sm text-gray-500">No other crawls right now.</p>
      </section>

      <!-- Completed -->
      <section class="mb-8 space-y-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Completed crawls</h2>
        <div v-if="completedCrawls.length" class="space-y-3">
          <CrawlDashboardCard
            v-for="crawl in completedCrawls"
            :key="crawl.id"
            :crawl="crawl"
            accent="gray"
            @invite="openInvite(crawl)"
            @complete="toggleComplete(crawl, true)"
            @reopen="toggleComplete(crawl, false)"
            @deleted="loadDashboard"
          />
        </div>
        <p v-else class="text-sm text-gray-500">No completed crawls yet.</p>
      </section>
    </template>

    <UModal v-model="inviteOpen">
      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Invite to {{ inviteCrawl?.name }}</h3>
              <p class="text-sm text-gray-500">Search by username (3+ characters). Only the creator can invite.</p>
            </div>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" @click="inviteOpen = false" />
          </div>
        </template>

        <div class="space-y-3">
          <UInput
            v-model="inviteQuery"
            icon="i-heroicons-magnifying-glass-20-solid"
            placeholder="Type a username…"
            autocomplete="off"
            :loading="inviteSearching"
          />
          <ul v-if="inviteResults.length" class="divide-y rounded-md border dark:divide-gray-800 dark:border-gray-800">
            <li
              v-for="person in inviteResults"
              :key="person.userId"
              class="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <div>
                <p class="font-medium">@{{ person.username }}</p>
                <p class="text-xs text-gray-500">{{ person.displayName }}</p>
              </div>
              <UButton
                size="xs"
                color="amber"
                :loading="invitingUserId === person.userId"
                label="Invite"
                @click="sendInvite(person)"
              />
            </li>
          </ul>
          <p v-else-if="inviteQuery.trim().length >= 3 && !inviteSearching" class="text-sm text-gray-500">
            No users found. They may need to open Pub Crawls once to create a username.
          </p>
          <p v-if="inviteMessage" class="text-sm text-emerald-700">{{ inviteMessage }}</p>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({})

const { isLoggedIn, initializeAuth } = useAuth()

useSiteSeo({
  title: 'Pub Crawls',
  description: 'Manage your pub crawl lists, invites, and shared crawls.',
  path: '/pub-crawls',
})

type Profile = { userId: string; username: string; displayName: string }
type CrawlMember = {
  id?: string
  userId: string
  username: string
  displayName: string
  status: string
  role: 'owner' | 'member'
}
type CrawlCard = {
  id: string
  name: string
  stopCount: number
  currentStopIndex: number
  completedAt: string | null
  canEdit: boolean
  role: 'owner' | 'member'
  members: CrawlMember[]
  updatedAt: string
}

const profile = ref<Profile | null>(null)
const activeCrawl = ref<CrawlCard | null>(null)
const otherCrawls = ref<CrawlCard[]>([])
const completedCrawls = ref<CrawlCard[]>([])
const pendingInvites = ref<any[]>([])
const notifications = ref<any[]>([])
const unreadNotificationCount = ref(0)
const loading = ref(false)
const loaded = ref(false)
const errorMessage = ref('')
const respondingId = ref<string | null>(null)

const inviteOpen = ref(false)
const inviteCrawl = ref<CrawlCard | null>(null)
const inviteQuery = ref('')
const inviteResults = ref<Profile[]>([])
const inviteSearching = ref(false)
const invitingUserId = ref<string | null>(null)
const inviteMessage = ref('')
let inviteTimer: ReturnType<typeof setTimeout> | null = null

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await useAuthFetch<any>('/api/crawls/dashboard')
    profile.value = data.profile
    activeCrawl.value = data.activeCrawl
    otherCrawls.value = data.otherCrawls || []
    completedCrawls.value = data.completedCrawls || []
    pendingInvites.value = data.pendingInvites || []
    notifications.value = data.notifications || []
    unreadNotificationCount.value = data.unreadNotificationCount || 0
    loaded.value = true
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not load pub crawls'
  } finally {
    loading.value = false
  }
}

async function respondInvite(memberId: string, action: 'accept' | 'decline') {
  respondingId.value = memberId
  errorMessage.value = ''
  try {
    await useAuthFetch(`/api/crawls/invites/${memberId}/${action}`, { method: 'POST' })
    await loadDashboard()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not respond to invite'
  } finally {
    respondingId.value = null
  }
}

async function toggleComplete(crawl: CrawlCard, completed: boolean) {
  if (!crawl.canEdit) return
  try {
    await useAuthFetch(`/api/crawls/${crawl.id}`, {
      method: 'PUT',
      body: { completed },
    })
    await loadDashboard()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not update crawl'
  }
}

function openInvite(crawl: CrawlCard) {
  if (!crawl.canEdit) return
  inviteCrawl.value = crawl
  inviteQuery.value = ''
  inviteResults.value = []
  inviteMessage.value = ''
  inviteOpen.value = true
}

watch(inviteQuery, (value) => {
  if (inviteTimer) clearTimeout(inviteTimer)
  const q = value.trim()
  if (q.length < 3) {
    inviteResults.value = []
    inviteSearching.value = false
    return
  }
  inviteSearching.value = true
  inviteTimer = setTimeout(async () => {
    try {
      inviteResults.value = await useAuthFetch<Profile[]>('/api/users/search', { params: { q } })
    } catch {
      inviteResults.value = []
    } finally {
      inviteSearching.value = false
    }
  }, 250)
})

async function sendInvite(person: Profile) {
  if (!inviteCrawl.value) return
  invitingUserId.value = person.userId
  inviteMessage.value = ''
  try {
    await useAuthFetch(`/api/crawls/${inviteCrawl.value.id}/members`, {
      method: 'POST',
      body: { userId: person.userId, username: person.username },
    })
    inviteMessage.value = `Invited @${person.username}`
    await loadDashboard()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not send invite'
    inviteOpen.value = false
  } finally {
    invitingUserId.value = null
  }
}

async function markNotificationsRead() {
  try {
    await useAuthFetch('/api/notifications', {
      method: 'POST',
      body: { markAllRead: true },
    })
    await loadDashboard()
  } catch {
    /* ignore */
  }
}

onMounted(async () => {
  await initializeAuth()
  if (!isLoggedIn.value) {
    await navigateTo('/login')
    return
  }
  void loadDashboard()
})
</script>
