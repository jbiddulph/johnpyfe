<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />

    <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="flex flex-col gap-2">
        <h1 class="text-4xl font-bold">Site-wide SEO</h1>
        <p class="max-w-3xl text-gray-600 dark:text-gray-300">
          The SEO agent reviews the whole site — every page type, keyword usage, link titles, image alt text, intro
          copy and news freshness — and proposes changes. Nothing goes live until you approve it here, one proposal at
          a time or a whole batch at once.
        </p>
      </div>
      <NuxtLink to="/admin/seo-agent" class="text-blue-600 hover:underline dark:text-blue-400">
        Back to listing SEO agent
      </NuxtLink>
    </div>

    <p v-if="loading && !overview" class="text-gray-600">Loading...</p>
    <p v-if="errorMessage" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {{ errorMessage }}
    </p>

    <div v-if="overview" class="space-y-8">
      <div
        v-if="!overview.migrationReady"
        class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
      >
        The site SEO database migration (<code>20260909180000_add_site_seo_management</code>) has not been applied yet.
      </div>

      <!-- Run audit -->
      <section class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="flex-1">
            <h2 class="text-2xl font-semibold">Run a site audit</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Optional: tell the agent what to concentrate on, e.g. “rewrite all town and county titles to include the
              number of pubs”, “remove the word bar from keywords everywhere”, or “refresh the news headlines”.
            </p>
            <textarea
              v-model="focus"
              rows="2"
              class="mt-3 w-full rounded-md border border-gray-300 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-900"
              placeholder="Focus for this audit (optional)"
              :disabled="Boolean(runningAudit)"
            />
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              OpenAI key: {{ overview.openAiConfigured ? 'configured' : 'missing — a rule-based audit will run instead' }}.
              Audits take one to three minutes.
            </p>
          </div>
          <div class="flex flex-col items-stretch gap-2 lg:w-56">
            <button
              type="button"
              class="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              :disabled="startingAudit || Boolean(runningAudit) || !overview.migrationReady"
              @click="startAudit"
            >
              {{ startingAudit ? 'Starting…' : runningAudit ? 'Audit in progress…' : 'Run site audit' }}
            </button>
            <div
              v-if="runningAudit"
              class="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
            >
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span class="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              Started {{ formatDateTime(runningAudit.startedAt) }}
            </div>
          </div>
        </div>
      </section>

      <!-- Summary cards -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="rounded-lg bg-white p-5 shadow dark:bg-gray-800">
          <p class="text-sm text-gray-500 dark:text-gray-400">Site SEO score</p>
          <p class="text-3xl font-bold" :class="scoreColour(latestAudit?.score)">
            {{ latestAudit?.score ?? '—' }}<span v-if="latestAudit?.score != null" class="text-base font-normal text-gray-400">/100</span>
          </p>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ latestAudit ? `Last audit ${formatDateTime(latestAudit.finishedAt || latestAudit.startedAt)}` : 'No audit yet' }}
          </p>
        </div>
        <button type="button" class="rounded-lg bg-white p-5 text-left shadow transition hover:ring-2 hover:ring-amber-400 dark:bg-gray-800" @click="selectStatus('pending')">
          <p class="text-sm text-gray-500 dark:text-gray-400">Awaiting approval</p>
          <p class="text-3xl font-bold text-amber-600">{{ overview.proposalCounts.pending || 0 }}</p>
          <p class="mt-2 text-xs text-amber-700 dark:text-amber-300">Review proposals</p>
        </button>
        <button type="button" class="rounded-lg bg-white p-5 text-left shadow transition hover:ring-2 hover:ring-green-400 dark:bg-gray-800" @click="selectStatus('applied')">
          <p class="text-sm text-gray-500 dark:text-gray-400">Applied</p>
          <p class="text-3xl font-bold text-green-600">{{ overview.proposalCounts.applied || 0 }}</p>
          <p class="mt-2 text-xs text-green-700 dark:text-green-300">Live on the site</p>
        </button>
        <div class="rounded-lg bg-white p-5 shadow dark:bg-gray-800">
          <p class="text-sm text-gray-500 dark:text-gray-400">Active overrides</p>
          <p class="text-3xl font-bold text-slate-700 dark:text-slate-200">{{ activeOverrideCount }}</p>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Page types with approved templates</p>
        </div>
      </div>

      <!-- Latest audit -->
      <section v-if="latestAudit && latestAudit.status !== 'running'" class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-2xl font-semibold">Latest audit</h2>
          <span class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide" :class="statusBadge(latestAudit.status)">
            {{ latestAudit.status.replaceAll('_', ' ') }}
          </span>
        </div>
        <p v-if="latestAudit.focus" class="mb-2 text-sm text-gray-500 dark:text-gray-400">Focus: {{ latestAudit.focus }}</p>
        <p v-if="latestAudit.error?.message" class="mb-3 text-sm text-red-600">{{ latestAudit.error.message }}</p>
        <p v-if="latestAudit.summary" class="whitespace-pre-line text-gray-800 dark:text-gray-100">{{ latestAudit.summary }}</p>

        <div v-if="latestAudit.findings?.length" class="mt-5">
          <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Findings</h3>
          <ul class="space-y-2">
            <li v-for="(finding, index) in latestAudit.findings" :key="index" class="flex gap-3 text-sm">
              <span class="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" :class="severityBadge(finding.severity)">
                {{ finding.severity }}
              </span>
              <span>
                <span class="font-medium capitalize">{{ finding.area }}:</span>
                <span class="text-gray-700 dark:text-gray-200"> {{ finding.detail }}</span>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Proposals -->
      <section class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 class="text-2xl font-semibold">Proposals</h2>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              type="button"
              class="rounded-full px-3 py-1 text-sm"
              :class="selectedStatus === option.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
              @click="selectStatus(option.value)"
            >
              {{ option.label }}
              <span v-if="option.value !== 'all' && overview.proposalCounts[option.value]" class="opacity-70">
                ({{ overview.proposalCounts[option.value] }})
              </span>
            </button>
          </div>
        </div>

        <div v-if="selectedStatus === 'pending' && proposals.length" class="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
          <span class="mr-auto text-amber-900 dark:text-amber-100">
            {{ proposals.length }} pending proposal{{ proposals.length === 1 ? '' : 's' }} — approve or reject the whole chunk:
          </span>
          <button
            type="button"
            class="rounded bg-green-600 px-3 py-1.5 font-medium text-white hover:bg-green-700 disabled:opacity-60"
            :disabled="bulkBusy"
            @click="bulkReview('approve')"
          >
            {{ bulkBusy ? 'Working…' : 'Approve all pending' }}
          </button>
          <button
            type="button"
            class="rounded border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950"
            :disabled="bulkBusy"
            @click="bulkReview('reject')"
          >
            Reject all pending
          </button>
        </div>

        <p v-if="proposalsLoading && proposals.length === 0" class="text-gray-600">Loading proposals…</p>
        <p v-else-if="proposals.length === 0" class="text-gray-600 dark:text-gray-300">
          {{ selectedStatus === 'pending' ? 'No proposals are waiting for approval. Run an audit to get new suggestions.' : 'Nothing here yet.' }}
        </p>

        <div class="space-y-4">
          <article
            v-for="proposal in proposals"
            :key="proposal.id"
            class="rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div class="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span class="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                    {{ overview.kindLabels[proposal.kind] || proposal.kind }}
                  </span>
                  <span class="rounded bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {{ targetLabel(proposal) }}
                  </span>
                  <span class="rounded px-2 py-0.5 font-medium" :class="impactBadge(proposal.impact)">
                    {{ proposal.impact }} impact
                  </span>
                  <span class="text-gray-500 dark:text-gray-400">{{ proposal.effort }} effort</span>
                  <span class="text-gray-400">· {{ formatDateTime(proposal.createdAt) }}</span>
                  <span v-if="proposal.status !== 'pending'" class="rounded px-2 py-0.5 font-semibold uppercase tracking-wide" :class="statusBadge(proposal.status)">
                    {{ proposal.status }}
                  </span>
                </div>
                <h3 class="text-lg font-semibold">{{ proposal.title }}</h3>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ proposal.rationale }}</p>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2 md:flex-col">
                <template v-if="proposal.status === 'pending'">
                  <button
                    type="button"
                    class="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    :disabled="busyIds.has(proposal.id)"
                    @click="review(proposal, 'approve')"
                  >
                    {{ proposal.kind === 'manual' ? 'Acknowledge' : isEdited(proposal.id) ? 'Approve edited' : 'Approve' }}
                  </button>
                  <button
                    type="button"
                    class="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950"
                    :disabled="busyIds.has(proposal.id)"
                    @click="review(proposal, 'reject')"
                  >
                    Reject
                  </button>
                </template>
                <button
                  v-else-if="proposal.status === 'applied'"
                  type="button"
                  class="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:hover:bg-gray-700"
                  :disabled="busyIds.has(proposal.id)"
                  @click="review(proposal, 'revert')"
                >
                  Revert
                </button>
              </div>
            </div>

            <div class="border-t border-gray-100 p-4 dark:border-gray-700">
              <div v-if="proposal.kind === 'manual'" class="text-sm">
                <p class="mb-1 font-medium">Steps for a developer</p>
                <ol class="list-decimal space-y-1 pl-5 text-gray-700 dark:text-gray-200">
                  <li v-for="(step, index) in proposal.after.steps || []" :key="index">{{ step }}</li>
                </ol>
              </div>

              <div v-else class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <th class="w-40 pb-2 pr-4">Field</th>
                      <th class="pb-2 pr-4">Before</th>
                      <th class="pb-2">After{{ proposal.status === 'pending' ? ' (editable)' : '' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="field in payloadFields(proposal)" :key="field" class="border-t border-gray-100 align-top dark:border-gray-700">
                      <td class="py-2 pr-4 font-medium">{{ fieldLabel(field) }}</td>
                      <td class="py-2 pr-4 text-gray-500 dark:text-gray-400">
                        <span v-if="formatValue(proposal.before?.[field])" class="whitespace-pre-wrap">{{ formatValue(proposal.before?.[field]) }}</span>
                        <span v-else class="italic">empty</span>
                      </td>
                      <td class="py-2">
                        <textarea
                          v-if="proposal.status === 'pending' && isTextField(proposal, field)"
                          :value="editedValue(proposal, field)"
                          rows="2"
                          class="w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                          @input="setEdited(proposal, field, ($event.target as HTMLTextAreaElement).value)"
                        />
                        <span v-else class="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{{ formatValue(proposal.after?.[field]) }}</span>
                        <p v-if="previewFor(proposal, field)" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Preview: <span class="italic">{{ previewFor(proposal, field) }}</span>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </div>

        <div v-if="proposalsTotal > proposals.length" class="mt-4 text-center">
          <button type="button" class="text-sm text-blue-600 hover:underline dark:text-blue-400" @click="loadMoreProposals">
            Load more ({{ proposalsTotal - proposals.length }} remaining)
          </button>
        </div>
      </section>

      <!-- Active overrides -->
      <section class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 class="mb-1 text-2xl font-semibold">Live site SEO settings</h2>
        <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Approved templates currently overriding the built-in copy. Placeholders such as <code>{town}</code> are filled per page.
        </p>

        <div class="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Always include keywords</p>
            <p class="mt-1">{{ overview.config.settings.includeKeywords.join(', ') || '—' }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Always exclude keywords</p>
            <p class="mt-1">{{ overview.config.settings.excludeKeywords.join(', ') || '—' }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Title suffix</p>
            <p class="mt-1">| {{ overview.config.settings.titleSuffix || 'UK Pubs' }}</p>
          </div>
        </div>

        <p v-if="activeOverrideCount === 0" class="text-gray-600 dark:text-gray-300">
          No page-type overrides are live. Approve a proposal to change titles, descriptions, keywords, intro copy, link titles or alt text site-wide.
        </p>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th class="p-3">Page type</th>
                <th class="p-3">Overrides</th>
                <th class="p-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in activeOverrides" :key="entry.key" class="border-t border-gray-200 align-top dark:border-gray-700">
                <td class="p-3">
                  <p class="font-medium">{{ entry.label }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ entry.route }}</p>
                </td>
                <td class="p-3">
                  <dl class="space-y-1">
                    <div v-for="(value, field) in entry.fields" :key="field" class="flex gap-2">
                      <dt class="w-32 shrink-0 text-gray-500 dark:text-gray-400">{{ fieldLabel(String(field)) }}</dt>
                      <dd class="whitespace-pre-wrap">{{ value }}</dd>
                    </div>
                  </dl>
                </td>
                <td class="p-3 text-right">
                  <button
                    type="button"
                    class="text-sm text-red-600 hover:underline disabled:opacity-60 dark:text-red-300"
                    :disabled="busyIds.has(entry.key)"
                    @click="removeOverride(entry.key)"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Audit history -->
      <section v-if="overview.recentAudits.length" class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 class="mb-4 text-2xl font-semibold">Audit history</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-left dark:bg-gray-900">
              <tr>
                <th class="p-3">Started</th>
                <th class="p-3">Status</th>
                <th class="p-3">Score</th>
                <th class="p-3">Proposals</th>
                <th class="p-3">Focus</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="audit in overview.recentAudits" :key="audit.id" class="border-t border-gray-200 dark:border-gray-700">
                <td class="p-3">{{ formatDateTime(audit.startedAt) }}</td>
                <td class="p-3 capitalize">{{ audit.status.replaceAll('_', ' ') }}</td>
                <td class="p-3">{{ audit.score ?? '—' }}</td>
                <td class="p-3">
                  <button type="button" class="text-blue-600 hover:underline dark:text-blue-400" @click="selectAudit(audit.id)">
                    {{ audit.proposalCount }}
                  </button>
                </td>
                <td class="p-3 text-gray-500 dark:text-gray-400">{{ audit.focus || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SITE_SEO_FIELD_LABELS, renderSeoTemplate } from '@/utils/site-seo-pages'

const { $supabase } = useNuxtApp()
const requestFetch = useRequestFetch()
const { user, isAdmin, initializeAuth } = useAuth()
const toast = useToast()

type Audit = {
  id: string
  status: string
  focus: string | null
  score: number | null
  summary: string | null
  findings: Array<{ area: string; severity: string; detail: string }> | null
  proposalCount: number
  error: { message?: string } | null
  startedAt: string
  finishedAt: string | null
}

type Proposal = {
  id: string
  auditId: string
  kind: string
  target: string
  title: string
  rationale: string
  impact: string
  effort: string
  before: Record<string, any> | null
  after: Record<string, any>
  status: string
  createdAt: string
}

type Overview = {
  migrationReady: boolean
  openAiConfigured: boolean
  latestAudit: Audit | null
  recentAudits: Array<Pick<Audit, 'id' | 'status' | 'score' | 'focus' | 'proposalCount' | 'startedAt' | 'finishedAt' | 'error'>>
  proposalCounts: Record<string, number>
  config: {
    pages: Record<string, Record<string, string>>
    settings: { includeKeywords: string[]; excludeKeywords: string[]; titleSuffix: string | null }
  }
  registry: Array<{ key: string; label: string; route: string; scale: string; vars: string[]; supports: string[] }>
  kindLabels: Record<string, string>
}

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Admin', to: '/admin/dashboard' },
  { label: 'SEO Agent', to: '/admin/seo-agent' },
  { label: 'Site-wide SEO' },
]

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'applied', label: 'Applied' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reverted', label: 'Reverted' },
  { value: 'all', label: 'All' },
]

const PREVIEW_VARS: Record<string, Record<string, unknown>> = {
  town: { town: 'Brighton', county: 'East Sussex', venueCount: 214 },
  county: { county: 'East Sussex', venueCount: 1180, townCount: 42 },
  venue: { venue: 'The Crown', town: 'Brighton', county: 'East Sussex', postcode: 'BN1 1AA', venueType: 'Pub' },
  event: { event: 'Friday Quiz Night', venue: 'The Crown', town: 'Brighton', date: 'Fri 12 Sep' },
  'news-article': { title: 'Historic Brighton pub reopens after refurbishment', excerpt: 'The Crown has reopened…' },
  stadium: { club: 'Arsenal', stadium: 'Emirates Stadium', radiusMiles: 1 },
  search: { query: 'Brighton' },
}

const loading = ref(true)
const errorMessage = ref('')
const overview = ref<Overview | null>(null)
const focus = ref('')
const startingAudit = ref(false)
const bulkBusy = ref(false)
const busyIds = reactive(new Set<string>())

const proposals = ref<Proposal[]>([])
const proposalsTotal = ref(0)
const proposalsLoading = ref(false)
const selectedStatus = ref('pending')
const selectedAuditId = ref('')
const edits = reactive<Record<string, Record<string, string>>>({})

const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)

const latestAudit = computed(() => overview.value?.latestAudit ?? null)
const runningAudit = computed(() => (latestAudit.value?.status === 'running' ? latestAudit.value : null))

const activeOverrides = computed(() => {
  const pages = overview.value?.config.pages ?? {}
  const registry = overview.value?.registry ?? []
  return Object.entries(pages)
    .filter(([, fields]) => fields && Object.keys(fields).length)
    .map(([key, fields]) => {
      const definition = registry.find((item) => item.key === key)
      return { key, label: definition?.label ?? key, route: definition?.route ?? '', fields }
    })
})
const activeOverrideCount = computed(() => activeOverrides.value.length)

function formatDateTime(value?: string | null) {
  if (!value) return 'Not yet'
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function scoreColour(score?: number | null) {
  if (score == null) return 'text-gray-400'
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
    case 'applied':
      return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
    case 'running':
    case 'pending':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
    case 'failed':
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
    case 'acknowledged':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
    case 'medium':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
    case 'low':
      return 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
  }
}

function impactBadge(impact: string) {
  if (impact === 'high') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
  if (impact === 'medium') return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
}

function targetLabel(proposal: Proposal) {
  if (proposal.kind === 'keyword_strategy' || proposal.target === 'global') return 'Whole site'
  if (proposal.kind === 'news_refresh') return `News: /news/${proposal.target}`
  const definition = overview.value?.registry.find((item) => item.key === proposal.target)
  return definition ? `${definition.label} (${definition.route})` : proposal.target
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    ...SITE_SEO_FIELD_LABELS,
    includeKeywords: 'Always include',
    excludeKeywords: 'Always exclude',
    titleSuffix: 'Title suffix',
    title: 'Headline',
    excerpt: 'Standfirst',
    content: 'Article body',
  }
  return labels[field] || field
}

function payloadFields(proposal: Proposal) {
  return Object.keys(proposal.after ?? {})
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function isTextField(proposal: Proposal, field: string) {
  return proposal.kind !== 'manual' && typeof (proposal.after?.[field] ?? '') !== 'object' || Array.isArray(proposal.after?.[field])
}

function editedValue(proposal: Proposal, field: string) {
  return edits[proposal.id]?.[field] ?? formatValue(proposal.after?.[field])
}

function setEdited(proposal: Proposal, field: string, value: string) {
  if (!edits[proposal.id]) edits[proposal.id] = {}
  edits[proposal.id][field] = value
}

function isEdited(id: string) {
  const entry = edits[id]
  if (!entry) return false
  const proposal = proposals.value.find((item) => item.id === id)
  if (!proposal) return false
  return Object.entries(entry).some(([field, value]) => value !== formatValue(proposal.after?.[field]))
}

function editedPayload(proposal: Proposal): Record<string, unknown> | null {
  if (!isEdited(proposal.id)) return null
  const payload: Record<string, unknown> = { ...proposal.after }
  for (const [field, value] of Object.entries(edits[proposal.id] ?? {})) {
    payload[field] = Array.isArray(proposal.after?.[field]) ? value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : value
  }
  return payload
}

function previewFor(proposal: Proposal, field: string) {
  if (!field.endsWith('Template') && field !== 'introText' && field !== 'keywords') return ''
  const template = editedValue(proposal, field)
  if (!template || !template.includes('{')) return ''
  const vars = PREVIEW_VARS[proposal.target]
  if (!vars) return ''
  return renderSeoTemplate(template, vars)
}

async function adminToken() {
  const { data } = await $supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

function describeError(error: unknown, fallback: string) {
  const err = error as { data?: { statusMessage?: string }; message?: string }
  return err?.data?.statusMessage || err?.message || fallback
}

async function loadOverview(options: { silent?: boolean } = {}) {
  if (!options.silent) loading.value = true
  try {
    overview.value = await requestFetch<Overview>('/api/admin/ai/site-seo', {
      headers: { Authorization: `Bearer ${await adminToken()}` },
    })
    if (!options.silent) errorMessage.value = ''
  } catch (error) {
    if (!options.silent || !overview.value) errorMessage.value = describeError(error, 'Failed to load site SEO overview')
  } finally {
    loading.value = false
  }
}

async function loadProposals(options: { append?: boolean } = {}) {
  proposalsLoading.value = true
  try {
    const params = new URLSearchParams({
      status: selectedStatus.value,
      take: '25',
      skip: options.append ? String(proposals.value.length) : '0',
    })
    if (selectedAuditId.value) params.set('auditId', selectedAuditId.value)
    const result = await requestFetch<{ items: Proposal[]; total: number }>(`/api/admin/ai/site-seo/proposals?${params}`, {
      headers: { Authorization: `Bearer ${await adminToken()}` },
    })
    proposals.value = options.append ? [...proposals.value, ...result.items] : result.items
    proposalsTotal.value = result.total
  } catch (error) {
    errorMessage.value = describeError(error, 'Failed to load proposals')
  } finally {
    proposalsLoading.value = false
  }
}

function loadMoreProposals() {
  return loadProposals({ append: true })
}

function selectStatus(status: string) {
  selectedStatus.value = status
  selectedAuditId.value = ''
  loadProposals()
}

function selectAudit(auditId: string) {
  selectedAuditId.value = auditId
  selectedStatus.value = 'all'
  loadProposals()
  if (import.meta.client) document.querySelector('h2')?.scrollIntoView({ behavior: 'smooth' })
}

async function startAudit() {
  startingAudit.value = true
  errorMessage.value = ''
  try {
    const result = await requestFetch<{ started: boolean; alreadyRunning?: boolean }>('/api/admin/ai/site-seo/audit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await adminToken()}` },
      body: { focus: focus.value },
    })
    if (result.alreadyRunning) toast.add({ title: 'An audit is already running', color: 'amber' })
    else toast.add({ title: 'Site audit started', description: 'Proposals will appear here when it finishes.', color: 'green' })
    await loadOverview({ silent: true })
    startPolling()
  } catch (error) {
    errorMessage.value = describeError(error, 'Failed to start the site audit')
  } finally {
    startingAudit.value = false
  }
}

async function review(proposal: Proposal, action: 'approve' | 'reject' | 'revert') {
  busyIds.add(proposal.id)
  try {
    const body: Record<string, unknown> = { action }
    if (action === 'approve') {
      const edited = editedPayload(proposal)
      if (edited) body.after = edited
    }
    await requestFetch(`/api/admin/ai/site-seo/proposals/${proposal.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await adminToken()}` },
      body,
    })
    delete edits[proposal.id]
    toast.add({
      title: action === 'approve' ? (proposal.kind === 'manual' ? 'Acknowledged' : 'Applied to the site') : action === 'reject' ? 'Proposal rejected' : 'Change reverted',
      color: action === 'reject' ? 'gray' : 'green',
    })
    await Promise.all([loadProposals(), loadOverview({ silent: true })])
  } catch (error) {
    toast.add({ title: describeError(error, `Failed to ${action} proposal`), color: 'red' })
  } finally {
    busyIds.delete(proposal.id)
  }
}

async function bulkReview(action: 'approve' | 'reject') {
  if (!proposals.value.length) return
  const label = action === 'approve' ? 'Approve and apply' : 'Reject'
  if (import.meta.client && !window.confirm(`${label} all ${proposals.value.length} pending proposals shown?`)) return
  bulkBusy.value = true
  try {
    const result = await requestFetch<{ done: number; errors: Array<{ id: string; message: string }> }>('/api/admin/ai/site-seo/proposals/bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await adminToken()}` },
      body: { action, ids: proposals.value.map((item) => item.id) },
    })
    toast.add({
      title: `${result.done} proposal${result.done === 1 ? '' : 's'} ${action === 'approve' ? 'applied' : 'rejected'}`,
      description: result.errors.length ? `${result.errors.length} failed: ${result.errors[0]?.message}` : undefined,
      color: result.errors.length ? 'amber' : 'green',
    })
    await Promise.all([loadProposals(), loadOverview({ silent: true })])
  } catch (error) {
    toast.add({ title: describeError(error, 'Bulk review failed'), color: 'red' })
  } finally {
    bulkBusy.value = false
  }
}

async function removeOverride(pageKey: string) {
  if (import.meta.client && !window.confirm('Remove every approved override for this page type and restore the built-in copy?')) return
  busyIds.add(pageKey)
  try {
    await requestFetch(`/api/admin/ai/site-seo/page-config/${pageKey}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await adminToken()}` },
    })
    toast.add({ title: 'Override removed', color: 'green' })
    await loadOverview({ silent: true })
  } catch (error) {
    toast.add({ title: describeError(error, 'Failed to remove override'), color: 'red' })
  } finally {
    busyIds.delete(pageKey)
  }
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function startPolling() {
  if (pollTimer.value) return
  pollTimer.value = setInterval(async () => {
    if (document.visibilityState === 'hidden') return
    const wasRunning = Boolean(runningAudit.value)
    await loadOverview({ silent: true })
    if (wasRunning && !runningAudit.value) {
      stopPolling()
      await loadProposals()
      toast.add({ title: 'Site audit finished', description: `${latestAudit.value?.proposalCount ?? 0} proposals ready for review.`, color: 'green' })
    } else if (!runningAudit.value) {
      stopPolling()
    }
  }, 4000)
}

watchEffect(() => {
  if (!isAdmin.value && user.value !== null) navigateTo('/')
})

async function boot() {
  await Promise.all([loadOverview(), loadProposals()])
  if (runningAudit.value) startPolling()
}

onMounted(async () => {
  await initializeAuth()
  if (isAdmin.value) await boot()
})

watch(isAdmin, (admin) => {
  if (admin) boot()
  else stopPolling()
})

onUnmounted(stopPolling)

useSiteSeo({
  title: 'Admin - Site-wide SEO',
  description: 'Review and approve site-wide SEO proposals from the UK Pubs AI SEO agent.',
  path: '/admin/seo-agent/site',
})
</script>
