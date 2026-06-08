<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1 class="text-4xl font-bold mb-6">Pub claims</h1>
    <p class="text-gray-600 mb-6">Review and verify ownership requests before pubs go live as claimed listings.</p>

    <p v-if="loading" class="text-gray-600">Loading…</p>
    <p v-else-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm border border-gray-200 dark:border-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th class="p-3 text-left">Pub</th>
            <th class="p-3 text-left">Organisation</th>
            <th class="p-3 text-left">Status</th>
            <th class="p-3 text-left">Requested</th>
            <th class="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="claim in claims" :key="claim.id" class="border-t border-gray-200 dark:border-gray-700">
            <td class="p-3">
              <NuxtLink :to="venuePath(claim.venue.id, claim.venue.slug)" class="font-medium hover:underline">
                {{ claim.venue.venuename }}
              </NuxtLink>
              <p class="text-gray-600">{{ claim.venue.town }}</p>
            </td>
            <td class="p-3">{{ claim.organisation.name }}</td>
            <td class="p-3 capitalize">{{ claim.status }}</td>
            <td class="p-3">{{ formatDate(claim.requestedAt) }}</td>
            <td class="p-3">
              <div v-if="claim.status === 'pending'" class="flex flex-wrap gap-2">
                <UButton size="xs" color="green" label="Verify" :loading="actingId === claim.id" @click="updateClaim(claim.id, 'verified')" />
                <UButton size="xs" color="red" variant="soft" label="Reject" :loading="actingId === claim.id" @click="updateClaim(claim.id, 'rejected')" />
              </div>
              <UButton
                v-else-if="claim.status === 'verified'"
                size="xs"
                color="red"
                variant="soft"
                label="Revoke"
                :loading="actingId === claim.id"
                @click="updateClaim(claim.id, 'revoked')"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $supabase } = useNuxtApp()
const requestFetch = useRequestFetch()
const { user, isAdmin, initializeAuth } = useAuth()

const loading = ref(true)
const errorMessage = ref('')
const actingId = ref('')
const claims = ref<Array<{
  id: string
  status: string
  requestedAt: string
  venue: { id: number; venuename: string; slug: string; town: string }
  organisation: { name: string }
}>>([])

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Admin', to: '/admin/dashboard' },
  { label: 'Claims' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB')
}

async function loadClaims() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await $supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not authenticated')

    claims.value = await requestFetch('/api/admin/claims', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Failed to load claims'
  } finally {
    loading.value = false
  }
}

async function updateClaim(id: string, status: string) {
  actingId.value = id
  try {
    const { data } = await $supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not authenticated')

    await requestFetch(`/api/admin/claims/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: { status },
    })
    await loadClaims()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Update failed'
  } finally {
    actingId.value = ''
  }
}

watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/events')
  }
})

onMounted(async () => {
  await initializeAuth()
  if (isAdmin.value) await loadClaims()
})

watch(isAdmin, (admin) => {
  if (admin) loadClaims()
})

useSiteSeo({
  title: 'Admin — pub claims',
  description: 'Review pub ownership claims.',
  path: '/admin/claims',
})
</script>
