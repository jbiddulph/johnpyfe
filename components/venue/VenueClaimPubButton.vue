<template>
  <section
    class="claim-venue rounded-xl border-2 border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/40 md:p-5"
    aria-label="Claim or manage this venue"
  >
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white">
          <template v-if="ownerAccess?.isOwner">You manage this venue</template>
          <template v-else-if="claimStatus?.verified">Verified operator listing</template>
          <template v-else>Is this your pub or venue?</template>
        </h2>
        <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
          <template v-if="ownerAccess?.isOwner && ownerAccess.canEdit">
            Update photos, menus, and your listing from your dashboard.
          </template>
          <template v-else-if="ownerAccess?.isOwner && ownerAccess.needsSubscription">
            Your claim is verified. Subscribe to unlock editing and verified branding.
          </template>
          <template v-else-if="claimStatus?.verified">
            This venue is managed by a verified operator.
          </template>
          <template v-else-if="claimStatus?.claimed">
            A claim is pending verification. We will confirm ownership before the listing is marked as claimed.
          </template>
          <template v-else>
            Claim this venue to verify ownership, then subscribe to add your logo, photos, menus, and events.
          </template>
        </p>
      </div>

      <div class="flex shrink-0 flex-wrap gap-2">
        <template v-if="ownerAccess?.isOwner">
          <UButton
            v-if="ownerAccess.canEdit"
            color="blue"
            label="Edit listing"
            :to="`/dashboard/pubs/${venueId}`"
          />
          <UButton
            v-if="ownerAccess.needsSubscription"
            color="blue"
            label="Subscribe to edit"
            to="/dashboard/billing"
          />
          <UButton variant="outline" label="Dashboard" to="/dashboard" />
        </template>

        <template v-else-if="claimStatus?.verified">
          <span class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <UIcon name="i-heroicons-check-badge-20-solid" class="h-5 w-5" />
            Verified operator
          </span>
        </template>

        <template v-else-if="!claimStatus?.claimed">
          <UButton
            v-if="isLoggedIn"
            color="blue"
            size="lg"
            label="Claim this venue"
            icon="i-heroicons-building-storefront-20-solid"
            :loading="claiming"
            @click="requestClaim"
          />
          <UButton
            v-else
            color="blue"
            size="lg"
            label="Sign in to claim"
            icon="i-heroicons-building-storefront-20-solid"
            :to="loginRedirect"
          />
        </template>

        <template v-else>
          <UButton variant="soft" label="View dashboard" to="/dashboard" />
        </template>
      </div>
    </div>

    <p v-if="message" class="mt-3 text-sm" :class="messageIsError ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'">
      {{ message }}
    </p>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  venueId: number
}>()

const route = useRoute()
const { isLoggedIn, initializeAuth } = useAuth()

const claimStatus = ref<{ claimed: boolean; verified: boolean; status?: string } | null>(null)
const ownerAccess = ref<{
  isOwner: boolean
  canEdit: boolean
  needsSubscription: boolean
} | null>(null)
const claiming = ref(false)
const message = ref('')
const messageIsError = ref(false)

const loginRedirect = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))

async function loadClaimStatus() {
  try {
    claimStatus.value = await $fetch(`/api/venues/${props.venueId}/claim-status`)
  } catch {
    claimStatus.value = { claimed: false, verified: false }
  }
}

async function loadOwnerAccess() {
  ownerAccess.value = null
  if (!isLoggedIn.value) return

  try {
    const status = await useAuthFetch<{
      organisation?: { hasProAccess: boolean }
      claims?: Array<{ venueId: number; status: string }>
    }>('/api/billing/status')

    const claim = status.claims?.find(
      (item) => item.venueId === props.venueId && item.status === 'verified',
    )
    if (!claim) return

    ownerAccess.value = {
      isOwner: true,
      canEdit: Boolean(status.organisation?.hasProAccess),
      needsSubscription: !status.organisation?.hasProAccess,
    }
  } catch {
    ownerAccess.value = null
  }
}

async function requestClaim() {
  claiming.value = true
  message.value = ''
  messageIsError.value = false
  try {
    const result = await useAuthFetch<{ message: string }>('/api/claims/request', {
      method: 'POST',
      body: { venueId: props.venueId },
    })
    message.value = result.message
    await loadClaimStatus()
    await loadOwnerAccess()
  } catch (error: unknown) {
    messageIsError.value = true
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    message.value = err?.data?.statusMessage || err?.statusMessage || 'Could not submit claim'
  } finally {
    claiming.value = false
  }
}

async function refresh() {
  await loadClaimStatus()
  await loadOwnerAccess()
}

onMounted(async () => {
  await initializeAuth()
  await refresh()
})

watch(isLoggedIn, () => {
  refresh()
})
</script>
