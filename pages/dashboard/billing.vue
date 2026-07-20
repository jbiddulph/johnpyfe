<template>
  <div class="container mx-auto p-4 my-8 max-w-4xl">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1 class="text-4xl font-bold mb-2">Billing</h1>
    <p class="text-gray-600 dark:text-gray-400 mb-6">
      Monthly subscriptions renew on the <strong>1st of each month</strong>. New sign-ups are pro-rated until the next billing date.
    </p>

    <UAlert
      v-if="route.query.checkout === 'success'"
      color="green"
      variant="soft"
      title="Payment received"
      :description="confirmingSession ? 'Activating your subscription…' : 'Your subscription is active. You can edit your verified venues from the dashboard.'"
      class="mb-6"
    />

    <UAlert
      v-if="status?.stripeTestMode && status?.stripeTestPaymentConfigured"
      color="blue"
      variant="soft"
      title="Stripe test mode"
      description="Checkout uses your £4.99 test price (STRIPE_TEST_PAYMENT) for every plan. Use card 4242 4242 4242 4242."
      class="mb-6"
    />

    <UAlert
      v-if="route.query.checkout === 'canceled'"
      color="blue"
      variant="soft"
      title="Checkout canceled"
      description="No payment was taken. You can choose a plan below when you are ready."
      class="mb-6"
    />

    <p v-if="!isLoggedIn" class="text-gray-600">
      <NuxtLink to="/login" class="text-blue-600 hover:underline">Sign in</NuxtLink> to manage billing.
    </p>
    <p v-else-if="loading" class="text-gray-600">Loading…</p>

    <UAlert
      v-if="errorMessage"
      color="red"
      variant="soft"
      title="Something went wrong"
      :description="errorMessage"
      class="mb-6"
    />

    <UAlert
      v-if="status && !status.hasOrganisation"
      color="blue"
      variant="soft"
      title="Claim a venue when you are ready"
      description="You can subscribe now. After payment, claim a venue from its page and we will verify ownership before editing goes live."
      class="mb-6"
    />

    <template v-if="status && !loading && isLoggedIn">
      <section class="mb-8 rounded-lg border border-gray-200 p-5 dark:border-gray-700">
        <h2 class="text-xl font-bold mb-2">Current plan</h2>
        <p class="text-gray-700 dark:text-gray-300">
          {{ status.organisation?.planLabel || 'No active plan' }}
          <span v-if="status.organisation?.subscriptionStatus"> — {{ status.organisation.subscriptionStatus }}</span>
        </p>
        <p v-if="status.organisation?.currentPeriodEnd" class="text-sm text-gray-600 mt-1">
          Current period ends {{ formatDate(status.organisation.currentPeriodEnd) }}
        </p>
        <p v-if="status.organisation" class="text-sm text-gray-600 mt-2">
          Verified pubs: {{ status.organisation.verifiedClaimCount }}
          <span v-if="status.organisation.pubLimit"> / {{ status.organisation.pubLimit }}</span>
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <UButton
            v-if="status.organisation?.hasProAccess"
            label="Manage billing"
            variant="outline"
            :loading="portalLoading"
            @click="openPortal"
          />
          <UButton
            label="Refresh subscription"
            variant="soft"
            :loading="syncing"
            @click="syncSubscription"
          />
        </div>
      </section>

      <section>
        <h2 class="text-2xl font-bold mb-4">Plans</h2>
        <ul class="grid gap-4 sm:grid-cols-2 list-none p-0 m-0">
          <li
            v-for="plan in status.plans"
            :key="plan.id"
            class="rounded-lg border border-gray-200 p-5 dark:border-gray-700"
          >
            <h3 class="text-lg font-bold">{{ plan.label }}</h3>
            <p class="text-2xl font-semibold mt-1">£{{ plan.monthlyGbp.toFixed(2) }}<span class="text-sm font-normal text-gray-600">/month</span></p>
            <p class="text-sm text-gray-600 mt-1">Up to {{ plan.pubLimit }} {{ plan.pubLimit === 1 ? 'pub' : 'pubs' }}</p>
            <UButton
              class="mt-4"
              color="blue"
              :label="status.organisation?.plan === plan.id ? 'Current plan' : `Choose ${plan.label}`"
              :disabled="status.organisation?.plan === plan.id && status.organisation?.hasProAccess"
              :loading="checkoutPlan === plan.id"
              @click="startCheckout(plan.id)"
            />
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { fetchErrorMessage } from '@/utils/fetch-error'
const route = useRoute()
const { isLoggedIn, initializeAuth } = useAuth()

const loading = ref(true)
const errorMessage = ref('')
const checkoutPlan = ref('')
const portalLoading = ref(false)
const syncing = ref(false)
const confirmingSession = ref(false)
const status = ref<{
  hasOrganisation: boolean
  stripeTestMode?: boolean
  stripeTestPaymentConfigured?: boolean
  organisation?: {
    plan: string
    planLabel: string | null
    pubLimit: number
    subscriptionStatus: string | null
    currentPeriodEnd: string | null
    verifiedClaimCount: number
    hasProAccess: boolean
  }
  plans: Array<{ id: string; label: string; monthlyGbp: number; pubLimit: number }>
} | null>(null)

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Billing' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

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
    errorMessage.value = fetchErrorMessage(error, 'Failed to load billing')
  } finally {
    loading.value = false
  }
}

async function startCheckout(planId: string) {
  checkoutPlan.value = planId
  errorMessage.value = ''
  try {
    const { url } = await useAuthFetch<{ url: string | null }>('/api/billing/checkout', {
      method: 'POST',
      body: { plan: planId },
    })
    if (url) {
      window.location.href = url
    }
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Checkout failed')
  } finally {
    checkoutPlan.value = ''
  }
}

async function openPortal() {
  portalLoading.value = true
  errorMessage.value = ''
  try {
    const { url } = await useAuthFetch<{ url: string }>('/api/billing/portal', { method: 'POST' })
    if (url) window.location.href = url
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Could not open billing portal')
  } finally {
    portalLoading.value = false
  }
}

async function confirmCheckoutSession() {
  const sessionId = String(route.query.session_id || '').trim()
  if (!sessionId || route.query.checkout !== 'success') return

  confirmingSession.value = true
  errorMessage.value = ''
  try {
    await useAuthFetch('/api/billing/confirm-session', {
      method: 'POST',
      body: { sessionId },
    })
    await loadStatus()
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Could not confirm checkout — try Refresh subscription')
  } finally {
    confirmingSession.value = false
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
  await confirmCheckoutSession()
  if (
    route.query.checkout === 'success'
    && status.value?.organisation
    && !status.value.organisation.hasProAccess
  ) {
    await syncSubscription()
  }
})

useSiteSeo({
  title: 'Billing — pub owner dashboard',
  description: 'Manage your UK Pubs subscription.',
  path: '/dashboard/billing',
})
</script>
