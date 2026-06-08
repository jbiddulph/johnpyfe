<template>
  <div class="claim-pub">
    <p v-if="claimStatus?.verified" class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      <UIcon name="i-heroicons-check-badge-20-solid" class="h-4 w-4" />
      Verified operator
    </p>

    <template v-else-if="!claimStatus?.claimed">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Own or manage this pub?</p>
      <UButton
        v-if="isLoggedIn"
        color="amber"
        label="Claim this pub"
        :loading="claiming"
        @click="requestClaim"
      />
      <UButton
        v-else
        color="amber"
        label="Sign in to claim"
        :to="loginRedirect"
      />
    </template>

    <p v-else class="text-sm text-gray-600 dark:text-gray-400">
      Claim pending verification.
      <NuxtLink to="/dashboard" class="text-amber-600 hover:underline">View dashboard</NuxtLink>
    </p>

    <p v-if="message" class="mt-2 text-sm" :class="messageIsError ? 'text-red-600' : 'text-emerald-700'">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  venueId: number
}>()

const route = useRoute()
const { user, isLoggedIn, initializeAuth } = useAuth()

const claimStatus = ref<{ claimed: boolean; verified: boolean; status?: string } | null>(null)
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
    claimStatus.value = null
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
  } catch (error: unknown) {
    messageIsError.value = true
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    message.value = err?.data?.statusMessage || err?.statusMessage || 'Could not submit claim'
  } finally {
    claiming.value = false
  }
}

onMounted(async () => {
  await initializeAuth()
  await loadClaimStatus()
})
</script>
