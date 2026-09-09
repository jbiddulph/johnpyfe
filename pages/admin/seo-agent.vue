<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
      <div class="flex flex-col gap-2">
        <h1 class="text-4xl font-bold">SEO Agent</h1>
        <p class="text-gray-600 dark:text-gray-300">
          The daily job analyses live listings for thin or missing SEO, whether or not they have been processed before, then writes improvements through the app SEO agent.
        </p>
      </div>
      <button
        type="button"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        :disabled="startingRun || loading"
        @click="startSeoBatch"
      >
        {{ startingRun ? 'Starting…' : 'Run 500 now' }}
      </button>
    </div>

    <p v-if="loading && !agentStatus" class="text-gray-600">Loading...</p>
    <p v-if="errorMessage" class="text-red-600 mb-4">{{ errorMessage }}</p>

    <div v-if="agentStatus" class="space-y-8">
      <div
        v-if="!agentStatus?.migrationReady"
        class="border border-amber-200 bg-amber-50 text-amber-900 rounded-lg p-4 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
      >
        The AI SEO database migration has not been applied yet.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p class="text-sm text-gray-500 dark:text-gray-400">Pending improvements</p>
          <p class="text-3xl font-bold text-amber-600">{{ agentStatus?.totals.pendingRecommendations }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p class="text-sm text-gray-500 dark:text-gray-400">Applied improvements</p>
          <p class="text-3xl font-bold text-green-600">{{ agentStatus?.totals.appliedRecommendations }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p class="text-sm text-gray-500 dark:text-gray-400">Completed runs</p>
          <p class="text-3xl font-bold text-blue-600">{{ agentStatus?.totals.completedRuns }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p class="text-sm text-gray-500 dark:text-gray-400">Need SEO improvement</p>
          <p class="text-3xl font-bold text-slate-700 dark:text-slate-200">{{ agentStatus?.totals.remainingListings }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p class="text-sm text-gray-500 dark:text-gray-400">Failed runs</p>
          <p class="text-3xl font-bold text-red-600">{{ agentStatus?.totals.failedRuns }}</p>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-2xl font-semibold mb-4">Schedule</h2>
        <dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Cron</dt>
            <dd class="font-mono">{{ agentStatus?.schedule.cron }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">UTC</dt>
            <dd>{{ agentStatus?.schedule.utcTime }} daily</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">UK time</dt>
            <dd>{{ agentStatus?.schedule.ukSummerTime }} BST / {{ agentStatus?.schedule.ukWinterTime }} GMT</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Daily limit</dt>
            <dd>{{ agentStatus?.schedule.dailyLimit }} listings</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Concurrency</dt>
            <dd>{{ agentStatus?.schedule.concurrency }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Web search</dt>
            <dd>{{ agentStatus?.schedule.webSearchEnabled ? 'Enabled' : 'Disabled' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">OpenAI key</dt>
            <dd>{{ agentStatus?.schedule.openAiConfigured ? 'Configured' : 'Missing' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Latest recommendation</dt>
            <dd>{{ formatDateTime(agentStatus?.totals.latestRecommendationAt) }}</dd>
          </div>
        </dl>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-2xl font-semibold mb-4">Recent Runs</h2>
        <p v-if="agentStatus?.recentRuns.length === 0" class="text-gray-600 dark:text-gray-300">
          No SEO agent runs have been recorded yet.
        </p>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm border border-gray-200 dark:border-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="p-3 text-left">Started</th>
                <th class="p-3 text-left">Status</th>
                <th class="p-3 text-left">Requested</th>
                <th class="p-3 text-left">Processed</th>
                <th class="p-3 text-left">Drafted</th>
                <th class="p-3 text-left">Applied</th>
                <th class="p-3 text-left">Errors</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="run in agentStatus?.recentRuns"
                :key="run.id"
                class="border-t border-gray-200 dark:border-gray-700"
              >
                <td class="p-3">{{ formatDateTime(run.startedAt) }}</td>
                <td class="p-3 capitalize">{{ run.status.replaceAll('_', ' ') }}</td>
                <td class="p-3">{{ run.requestedLimit }}</td>
                <td class="p-3">{{ run.processedCount }}</td>
                <td class="p-3">{{ run.draftedCount }}</td>
                <td class="p-3">{{ run.appliedCount }}</td>
                <td class="p-3">{{ run.errorCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $supabase } = useNuxtApp()
const requestFetch = useRequestFetch()
const { user, isAdmin, initializeAuth } = useAuth()

type SeoAgentStatus = {
  schedule: {
    cron: string
    utcTime: string
    ukSummerTime: string
    ukWinterTime: string
    dailyLimit: number
    concurrency: number
    webSearchEnabled: boolean
    openAiConfigured: boolean
  }
  totals: {
    totalRuns: number
    completedRuns: number
    failedRuns: number
    pendingRecommendations: number
    appliedRecommendations: number
    remainingListings: number
    latestRecommendationAt: string | null
  }
  recentRuns: Array<{
    id: string
    status: string
    requestedLimit: number
    processedCount: number
    draftedCount: number
    appliedCount: number
    errorCount: number
    startedAt: string
    finishedAt: string | null
  }>
  migrationReady: boolean
}

const loading = ref(true)
const startingRun = ref(false)
const errorMessage = ref('')
const agentStatus = ref<SeoAgentStatus | null>(null)

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Admin', to: '/admin/dashboard' },
  { label: 'SEO Agent' },
]

function formatDateTime(value?: string | null) {
  if (!value) return 'Not yet'
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function adminToken() {
  const { data } = await $supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

async function loadSeoAgentStatus() {
  loading.value = true
  errorMessage.value = ''
  try {
    agentStatus.value = await requestFetch('/api/admin/ai/seo-agent', {
      headers: { Authorization: `Bearer ${await adminToken()}` },
    })
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Failed to load SEO agent status'
  } finally {
    loading.value = false
  }
}

async function startSeoBatch() {
  startingRun.value = true
  errorMessage.value = ''
  try {
    await requestFetch('/api/admin/ai/seo-agent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await adminToken()}` },
      body: { limit: 500 },
    })
    await loadSeoAgentStatus()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Failed to start the SEO agent'
  } finally {
    startingRun.value = false
  }
}

watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/')
  }
})

onMounted(async () => {
  await initializeAuth()
  if (isAdmin.value) await loadSeoAgentStatus()
})

watch(isAdmin, (admin) => {
  if (admin) loadSeoAgentStatus()
})

useSiteSeo({
  title: 'Admin - SEO Agent',
  description: 'Monitor the UK Pubs AI SEO agent.',
  path: '/admin/seo-agent',
})
</script>
