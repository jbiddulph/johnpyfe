<template>
  <div class="container mx-auto p-4 my-8 max-w-4xl">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1 class="text-4xl font-bold mb-2">Pub dashboard</h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8">Manage claimed pubs, billing, and your listing profile.</p>

    <p v-if="!isLoggedIn" class="text-lg text-gray-600 mb-4">
      <NuxtLink to="/login" class="text-amber-600 hover:underline">Sign in</NuxtLink>
      to manage your pubs.
    </p>

    <p v-else-if="loading" class="text-gray-600">Loading…</p>
    <p v-else-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

    <template v-else-if="status">
      <section class="mb-8 rounded-lg border border-gray-200 p-5 dark:border-gray-700">
        <h2 class="text-2xl font-bold mb-3">Subscription</h2>
        <p v-if="!status.organisation?.hasProAccess" class="text-gray-600 mb-4">
          Subscribe to unlock logo, photos, menus, and verified branding on your pub pages.
          Billing is monthly, anchored to the 1st of each month.
        </p>
        <dl v-if="status.organisation" class="grid gap-2 text-sm sm:grid-cols-2 mb-4">
          <div><dt class="font-medium">Plan</dt><dd>{{ status.organisation.planLabel || 'None' }}</dd></div>
          <div><dt class="font-medium">Status</dt><dd>{{ status.organisation.subscriptionStatus || 'Not subscribed' }}</dd></div>
          <div><dt class="font-medium">Verified pubs</dt><dd>{{ status.organisation.verifiedClaimCount }} / {{ status.organisation.pubLimit || '—' }}</dd></div>
        </dl>
        <div class="flex flex-wrap gap-3">
          <UButton to="/dashboard/billing" color="amber" label="Billing & plans" />
          <UButton
            v-if="status.organisation && !status.organisation.hasProAccess"
            label="Refresh subscription"
            variant="soft"
            :loading="syncing"
            @click="syncSubscription"
          />
        </div>
      </section>

      <section>
        <h2 class="text-2xl font-bold mb-4">Your claims</h2>
        <p v-if="!status.claims?.length" class="text-gray-600">
          No claims yet. Open a venue page and click <strong>Claim this venue</strong>.
        </p>
        <ul v-else class="space-y-3 list-none p-0 m-0">
          <li
            v-for="claim in status.claims"
            :key="claim.id"
            class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <NuxtLink :to="venuePath(claim.venue.id, claim.venue.slug)" class="font-semibold text-lg hover:underline">
                  {{ claim.venue.venuename }}
                </NuxtLink>
                <p class="text-sm text-gray-600">{{ claim.venue.town }}</p>
                <p class="text-sm mt-1">
                  Status:
                  <span class="font-medium capitalize">{{ claim.status }}</span>
                </p>
              </div>
              <UButton
                v-if="claim.status === 'verified' && status.organisation?.hasProAccess"
                :to="`/dashboard/pubs/${claim.venue.id}`"
                label="Edit profile"
                variant="outline"
              />
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { fetchErrorMessage } from '@/utils/fetch-error'

const { user, isLoggedIn, initializeAuth } = useAuth()

const loading = ref(true)
const syncing = ref(false)
const errorMessage = ref('')
const status = ref<{
  organisation?: {
    hasProAccess: boolean
    planLabel?: string | null
    subscriptionStatus?: string | null
    verifiedClaimCount: number
    pubLimit: number
  }
  claims?: Array<{
    id: string
    status: string
    venue: { id: number; venuename: string; slug: string; town: string }
  }>
} | null>(null)

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard' },
]

async function loadStatus() {
  if (!isLoggedIn.value) {
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    status.value = await useAuthFetch('/api/billing/status')
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Failed to load dashboard')
    status.value = null
  } finally {
    loading.value = false
  }
}

async function syncSubscription() {
  syncing.value = true
  errorMessage.value = ''
  try {
    await useAuthFetch('/api/billing/sync', { method: 'POST' })
    await loadStatus()
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Could not refresh subscription')
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  await initializeAuth()
  await loadStatus()
  if (status.value?.organisation && !status.value.organisation.hasProAccess) {
    const hasVerified = status.value.claims?.some((claim) => claim.status === 'verified')
    if (hasVerified) {
      await syncSubscription()
    }
  }
})

useSiteSeo({
  title: 'Pub owner dashboard',
  description: 'Manage claimed pubs and subscriptions on UK Pubs.',
  path: '/dashboard',
})
</script>
