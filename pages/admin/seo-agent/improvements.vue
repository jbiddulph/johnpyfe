<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
      <div class="flex flex-col gap-2">
        <h1 class="text-4xl font-bold">{{ pageTitle }}</h1>
        <p class="text-gray-600 dark:text-gray-300">
          Compare the previous listing copy with what the SEO agent wrote.
        </p>
      </div>
      <NuxtLink
        to="/admin/seo-agent"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        Back to SEO Agent
      </NuxtLink>
    </div>

    <div v-if="run" class="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
      <p class="font-semibold mb-1">{{ formatDateTime(run.startedAt) }}</p>
      <p class="text-gray-600 dark:text-gray-300">
        {{ formatStatus(run.status) }} ·
        {{ run.processedCount }} / {{ run.requestedLimit }} processed ·
        {{ run.appliedCount }} applied ·
        {{ run.draftedCount }} drafted ·
        {{ run.errorCount }} errors
      </p>
      <p v-if="matchedBy === 'timeWindow'" class="mt-2 text-amber-700 dark:text-amber-300">
        This run finished before change history IDs were stored, so listings are matched by time. Overlapping runs may share some rows.
      </p>
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      <NuxtLink
        v-for="option in statusOptions"
        :key="option.value"
        :to="{ path: '/admin/seo-agent/improvements', query: statusQuery(option.value) }"
        class="rounded-full px-3 py-1 text-sm"
        :class="selectedStatus === option.value
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'"
      >
        {{ option.label }}
      </NuxtLink>
    </div>

    <p v-if="loading && items.length === 0" class="text-gray-600">Loading...</p>
    <p v-if="errorMessage" class="text-red-600 mb-4">{{ errorMessage }}</p>
    <p v-else-if="!loading && items.length === 0" class="text-gray-600 dark:text-gray-300">
      No SEO changes found for this view.
    </p>

    <div class="space-y-4">
      <article
        v-for="item in items"
        :key="item.id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow"
      >
        <button
          type="button"
          class="w-full text-left p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-3"
          @click="toggleItem(item.id)"
        >
          <div>
            <p class="text-lg font-semibold">{{ item.venueName }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ item.town }} · {{ formatStatus(item.status) }} · {{ formatDateTime(item.generatedAt) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ changedCount(item) }} field{{ changedCount(item) === 1 ? '' : 's' }} changed
              <span v-if="item.previousSource === 'missing'"> · previous copy was empty or missing</span>
              <span v-else-if="item.previousSource === 'previous_recommendation'"> · previous copy reconstructed from the last agent write</span>
            </p>
            <p v-if="titlePreview(item)" class="mt-2 text-sm text-gray-700 dark:text-gray-200">
              Title: {{ titlePreview(item) }}
            </p>
          </div>
          <span class="text-sm text-blue-600 dark:text-blue-400">
            {{ isExpanded(item.id) ? 'Hide changes' : 'Show changes' }}
          </span>
        </button>

        <div v-if="isExpanded(item.id)" class="border-t border-gray-200 dark:border-gray-700 px-5 pb-5">
          <p class="py-3">
            <NuxtLink :to="item.venuePath" class="text-sm text-blue-600 dark:text-blue-400 hover:underline" target="_blank">
              Open listing
            </NuxtLink>
          </p>
          <div class="space-y-4">
            <section
              v-for="diff in item.diffs"
              :key="diff.field"
              class="rounded-lg border p-4"
              :class="diff.changed
                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'"
            >
              <div class="flex items-center justify-between gap-2 mb-3">
                <h2 class="font-semibold">{{ diff.label }}</h2>
                <span class="text-xs uppercase tracking-wide" :class="diff.changed ? 'text-green-700 dark:text-green-300' : 'text-gray-500'">
                  {{ diff.changed ? 'Changed' : 'Unchanged' }}
                </span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Before</p>
                  <p class="whitespace-pre-wrap">{{ displayValue(diff.before) }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">After</p>
                  <p class="whitespace-pre-wrap">{{ displayValue(diff.after) }}</p>
                </div>
              </div>
            </section>
          </div>

          <div v-if="item.faqSuggestions.length" class="mt-4">
            <h2 class="font-semibold mb-2">Suggested FAQs</h2>
            <dl class="space-y-2 text-sm">
              <div v-for="faq in item.faqSuggestions" :key="faq.question">
                <dt class="font-medium">{{ faq.question }}</dt>
                <dd class="text-gray-600 dark:text-gray-300">{{ faq.answer }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </article>
    </div>

    <div v-if="hasMore" class="mt-6">
      <button
        type="button"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? 'Loading…' : 'Load more' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $supabase } = useNuxtApp()
const requestFetch = useRequestFetch()
const route = useRoute()
const { user, isAdmin, initializeAuth } = useAuth()

type SeoImprovementItem = {
  id: string
  venueName: string
  town: string
  venuePath: string
  status: string
  generatedAt: string
  previousSource: 'stored' | 'previous_recommendation' | 'missing'
  diffs: Array<{ field: string; label: string; before: string; after: string; changed: boolean }>
  faqSuggestions: Array<{ question: string; answer: string }>
}

type SeoImprovementsResponse = {
  items: SeoImprovementItem[]
  total: number
  skip: number
  take: number
  matchedBy: 'runId' | 'timeWindow' | null
  run: {
    id: string
    status: string
    requestedLimit: number
    processedCount: number
    appliedCount: number
    draftedCount: number
    errorCount: number
    startedAt: string
    finishedAt: string | null
  } | null
}

const loading = ref(true)
const loadingMore = ref(false)
const errorMessage = ref('')
const items = ref<SeoImprovementItem[]>([])
const total = ref(0)
const matchedBy = ref<'runId' | 'timeWindow' | null>(null)
const run = ref<SeoImprovementsResponse['run']>(null)
const expandedIds = ref<Record<string, boolean>>({})

const statusOptions = [
  { value: 'applied', label: 'Applied' },
  { value: 'pending', label: 'Pending' },
  { value: 'all', label: 'All' },
]

const selectedStatus = computed(() => {
  const status = String(route.query.status || '').toLowerCase()
  if (status === 'pending' || status === 'all' || status === 'applied') return status
  return route.query.runId ? 'all' : 'applied'
})

const selectedRunId = computed(() => String(route.query.runId || '').trim())

const pageTitle = computed(() => {
  if (run.value) return 'Run changes'
  if (selectedStatus.value === 'pending') return 'Pending improvements'
  if (selectedStatus.value === 'all') return 'SEO improvements'
  return 'Applied improvements'
})

const breadcrumbItems = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Admin', to: '/admin/dashboard' },
  { label: 'SEO Agent', to: '/admin/seo-agent' },
  { label: pageTitle.value },
])

const hasMore = computed(() => items.value.length < total.value)

function statusQuery(status: string) {
  return selectedRunId.value
    ? { status, runId: selectedRunId.value }
    : { status }
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not yet'
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function displayValue(value: string) {
  return value?.trim() ? value : 'Not set'
}

function changedCount(item: SeoImprovementItem) {
  return item.diffs.filter((diff) => diff.changed).length
}

function titlePreview(item: SeoImprovementItem) {
  const title = item.diffs.find((diff) => diff.field === 'pageTitle' && diff.changed)
  if (!title) return ''
  return `${displayValue(title.before)} → ${displayValue(title.after)}`
}

function isExpanded(id: string) {
  return Boolean(expandedIds.value[id])
}

function toggleItem(id: string) {
  expandedIds.value = {
    ...expandedIds.value,
    [id]: !expandedIds.value[id],
  }
}

async function adminToken() {
  const { data } = await $supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

async function loadImprovements(options: { append?: boolean } = {}) {
  if (options.append) loadingMore.value = true
  else loading.value = true
  if (!options.append) errorMessage.value = ''

  try {
    const skip = options.append ? items.value.length : 0
    const query = new URLSearchParams({
      status: selectedStatus.value,
      skip: String(skip),
      take: '20',
    })
    if (selectedRunId.value) query.set('runId', selectedRunId.value)

    const result = await requestFetch<SeoImprovementsResponse>(`/api/admin/ai/seo-agent/improvements?${query}`, {
      headers: { Authorization: `Bearer ${await adminToken()}` },
    })

    items.value = options.append ? [...items.value, ...result.items] : result.items
    total.value = result.total
    matchedBy.value = result.matchedBy
    run.value = result.run

    if (!options.append) {
      expandedIds.value = result.items.length === 1 ? { [result.items[0].id]: true } : {}
    }
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Failed to load SEO changes'
    if (!options.append) items.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  return loadImprovements({ append: true })
}

watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/')
  }
})

watch(
  () => [selectedStatus.value, selectedRunId.value],
  () => {
    if (isAdmin.value) loadImprovements()
  },
)

onMounted(async () => {
  await initializeAuth()
  if (isAdmin.value) await loadImprovements()
})

watch(isAdmin, (admin) => {
  if (admin) loadImprovements()
})

useSiteSeo({
  title: 'Admin - SEO Agent changes',
  description: 'Review SEO agent before and after listing copy.',
  path: '/admin/seo-agent/improvements',
})
</script>
