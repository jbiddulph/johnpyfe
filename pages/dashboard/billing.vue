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
      :description="confirmingSession
        ? 'Activating your subscription…'
        : claimVenueId
          ? 'Your subscription is active. Head back to the venue page to claim it.'
          : 'Your subscription is active. Open a venue page and click Claim this venue to get started.'"
      class="mb-6"
    >
      <template v-if="claimVenueId && !confirmingSession && status?.organisation?.hasProAccess" #description>
        Your subscription is active. Head back to the venue page to claim it.
        <UButton
          class="mt-3"
          color="green"
          label="Claim your venue"
          icon="i-heroicons-building-storefront-20-solid"
          :to="claimVenuePath"
        />
      </template>
    </UAlert>

    <UAlert
      v-else-if="claimVenueId && status && !status.organisation?.hasProAccess"
      color="primary"
      variant="soft"
      title="Subscribe to claim your venue"
      description="Claiming a venue requires an active subscription. Choose a plan below — after payment you will be sent back to the venue page to finish your claim."
      class="mb-6"
    />

    <UAlert
      v-if="status?.stripeTestMode && status?.stripeTestPaymentConfigured"
      color="primary"
      variant="soft"
      title="Stripe test mode"
      description="Checkout uses your £4.99 test price (STRIPE_TEST_PAYMENT) for every plan. Use card 4242 4242 4242 4242."
      class="mb-6"
    />

    <UAlert
      v-if="route.query.checkout === 'canceled'"
      color="primary"
      variant="soft"
      title="Checkout canceled"
      description="No payment was taken. You can choose a plan below when you are ready."
      class="mb-6"
    />

    <p v-if="!isLoggedIn" class="text-gray-600">
      <NuxtLink to="/login" class="text-primary-600 hover:underline">Sign in</NuxtLink> to manage billing.
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
      v-if="upgradeMessage"
      color="green"
      variant="soft"
      title="Plan updated"
      :description="upgradeMessage"
      class="mb-6"
    />

    <UAlert
      v-if="status && !status.hasOrganisation && !claimVenueId"
      color="primary"
      variant="soft"
      title="Subscribe first, then claim your venue"
      description="Claiming a venue requires an active subscription. Subscribe below, then open your venue's page and click Claim this venue — we verify ownership before editing goes live."
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
              color="primary"
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
const upgradeMessage = ref('')
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

// Venue the user was trying to claim (from the venue page's "Subscribe to claim" button)
const claimVenueId = computed(() => {
  const id = Number.parseInt(String(route.query.claim ?? ''), 10)
  return Number.isFinite(id) && id > 0 ? id : null
})
// The venue page 301s to the canonical slug, so any placeholder slug works here
const claimVenuePath = computed(() =>
  claimVenueId.value ? venuePath(claimVenueId.value, 'venue') : '/',
)

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
  upgradeMessage.value = ''
  try {
    const result = await useAuthFetch<{
      url: string | null
      upgraded?: boolean
      message?: string
    }>('/api/billing/checkout', {
      method: 'POST',
      body: { plan: planId, claimVenueId: claimVenueId.value ?? undefined },
    })
    if (result.upgraded) {
      upgradeMessage.value = result.message || 'Plan updated successfully.'
      await loadStatus()
      if (claimVenueId.value) {
        await navigateTo(claimVenuePath.value)
      }
      return
    }
    if (result.url) {
      window.location.href = result.url
      return
    }
    errorMessage.value = 'Checkout did not return a payment URL. Try Refresh subscription, then choose a plan again.'
  } catch (error: unknown) {
    const raw = fetchErrorMessage(error, 'Checkout failed')
    errorMessage.value = /^not found$/i.test(raw.trim())
      ? 'Stripe could not find the subscription or price for this account. Click Refresh subscription, then choose the plan again. If it still fails, the Stripe price IDs may not match your API key mode (test vs live).'
      : raw
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
