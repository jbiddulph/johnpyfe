<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold">Reports</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          On-site page views and share clicks for venues, events and other pages.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="option in periodOptions"
          :key="option.value"
          :label="option.label"
          :color="selectedPeriod === option.value ? 'amber' : 'gray'"
          :variant="selectedPeriod === option.value ? 'solid' : 'outline'"
          @click="selectedPeriod = option.value"
        />
      </div>
    </div>

    <p v-if="loading" class="text-lg text-gray-600">Loading reports…</p>
    <p v-else-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

    <template v-else-if="report">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p class="text-sm uppercase tracking-wide text-gray-500">Page views</p>
          <p class="text-3xl font-bold mt-2">{{ report.summary.pageviews.toLocaleString() }}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p class="text-sm uppercase tracking-wide text-gray-500">Share clicks</p>
          <p class="text-3xl font-bold mt-2">{{ report.summary.shares.toLocaleString() }}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p class="text-sm uppercase tracking-wide text-gray-500">Tracked paths</p>
          <p class="text-3xl font-bold mt-2">{{ report.summary.trackedPaths.toLocaleString() }}</p>
        </div>
      </div>

      <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-8 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <p v-for="(note, index) in report.notes" :key="index">{{ note }}</p>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <section>
          <h2 class="text-2xl font-bold mb-4">Top venues</h2>
          <div v-if="!report.topVenues.length" class="text-gray-600">No venue data yet.</div>
          <ol v-else class="space-y-3 list-none p-0 m-0">
            <li v-for="(row, index) in report.topVenues" :key="row.venueId">
              <NuxtLink :to="row.href" class="hub-card flex items-center justify-between gap-3">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="reports-rank">{{ index + 1 }}</span>
                  <span class="min-w-0">
                    <span class="hub-card__title block truncate">{{ row.name }}</span>
                    <span v-if="row.town" class="hub-card__meta block truncate">{{ row.town }}</span>
                  </span>
                </span>
                <span class="hub-card__meta shrink-0 text-right">
                  {{ row.pageviews }} views · {{ row.shares }} shares
                </span>
              </NuxtLink>
            </li>
          </ol>
        </section>

        <section>
          <h2 class="text-2xl font-bold mb-4">Top events</h2>
          <div v-if="!report.topEvents.length" class="text-gray-600">No event data yet.</div>
          <ol v-else class="space-y-3 list-none p-0 m-0">
            <li v-for="(row, index) in report.topEvents" :key="row.eventId">
              <NuxtLink :to="row.href" class="hub-card flex items-center justify-between gap-3">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="reports-rank">{{ index + 1 }}</span>
                  <span class="min-w-0">
                    <span class="hub-card__title block truncate">{{ row.title }}</span>
                    <span v-if="row.venueName" class="hub-card__meta block truncate">{{ row.venueName }}</span>
                  </span>
                </span>
                <span class="hub-card__meta shrink-0 text-right">
                  {{ row.pageviews }} views · {{ row.shares }} shares
                </span>
              </NuxtLink>
            </li>
          </ol>
        </section>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section>
          <h2 class="text-2xl font-bold mb-4">Top other pages</h2>
          <div v-if="!report.topPages.length" class="text-gray-600">No page data yet.</div>
          <ol v-else class="space-y-3 list-none p-0 m-0">
            <li v-for="(row, index) in report.topPages" :key="`${row.path}-${index}`">
              <NuxtLink :to="row.path" class="hub-card flex items-center justify-between gap-3">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="reports-rank">{{ index + 1 }}</span>
                  <span class="min-w-0">
                    <span class="hub-card__title block truncate">{{ row.label || row.path }}</span>
                    <span class="hub-card__meta block truncate">{{ row.pageType }}</span>
                  </span>
                </span>
                <span class="hub-card__meta shrink-0 text-right">
                  {{ row.pageviews }} views · {{ row.shares }} shares
                </span>
              </NuxtLink>
            </li>
          </ol>
        </section>

        <section>
          <h2 class="text-2xl font-bold mb-4">Share clicks by platform</h2>
          <div v-if="!report.sharesByPlatform.length" class="text-gray-600">No share data yet.</div>
          <ul v-else class="space-y-2">
            <li
              v-for="row in report.sharesByPlatform"
              :key="row.platform"
              class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
            >
              <span class="font-medium capitalize">{{ row.platform }}</span>
              <span class="text-gray-600 dark:text-gray-400">{{ row.count.toLocaleString() }}</span>
            </li>
          </ul>

          <h3 class="text-xl font-bold mt-8 mb-4">Daily trend</h3>
          <div v-if="!report.dailyTrend.length" class="text-gray-600">No daily trend for this period yet.</div>
          <ul v-else class="space-y-2 text-sm">
            <li
              v-for="row in report.dailyTrend"
              :key="String(row.date)"
              class="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-700"
            >
              <span>{{ formatDay(row.date) }}</span>
              <span>{{ row.pageviews }} views · {{ row.shares }} shares</span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
type Period = '7d' | '30d' | '90d' | 'all'

const { $supabase } = useNuxtApp()
const { user, isAdmin, initializeAuth } = useAuth()
const requestFetch = useRequestFetch()

const periodOptions = [
  { label: '7 days', value: '7d' as const },
  { label: '30 days', value: '30d' as const },
  { label: '90 days', value: '90d' as const },
  { label: 'All time', value: 'all' as const },
]

const selectedPeriod = ref<Period>('30d')
const loading = ref(true)
const errorMessage = ref('')
const report = ref<any>(null)

onMounted(async () => {
  await initializeAuth()
})

watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/')
  }
})

async function loadReports() {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data: sessionData } = await $supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) {
      errorMessage.value = 'You must be logged in as admin to view reports.'
      report.value = null
      return
    }

    report.value = await requestFetch(`/api/admin/reports?period=${selectedPeriod.value}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (error: any) {
    console.error('Failed to load reports:', error)
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Failed to load reports.'
    report.value = null
  } finally {
    loading.value = false
  }
}

watch(selectedPeriod, () => {
  if (isAdmin.value) loadReports()
})

watch(isAdmin, (admin) => {
  if (admin) loadReports()
}, { immediate: true })

function formatDay(value: string | Date) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

useSiteSeo({
  title: 'Admin reports',
  description: 'Performance reports for UK Pubs venues, events and pages.',
  path: '/admin/reports',
})
</script>

<style scoped>
.reports-rank {
  @apply flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200;
}
</style>
