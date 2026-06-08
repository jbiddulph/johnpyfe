<template>
  <div class="container mx-auto p-4 my-8 max-w-3xl">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1 class="text-4xl font-bold mb-6">Edit pub profile</h1>

    <p v-if="!isLoggedIn" class="text-gray-600">
      <NuxtLink to="/login" class="text-amber-600 hover:underline">Sign in</NuxtLink> to edit this pub.
    </p>
    <p v-else-if="loading" class="text-gray-600">Loading…</p>
    <p v-else-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

    <form v-else class="space-y-5" @submit.prevent="saveProfile">
      <div>
        <label class="block text-sm font-medium mb-1" for="logoUrl">Logo URL</label>
        <input id="logoUrl" v-model="form.logoUrl" type="url" class="input w-full" placeholder="https://…" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" for="headerImageUrl">Header image URL</label>
        <input id="headerImageUrl" v-model="form.headerImageUrl" type="url" class="input w-full" placeholder="https://…" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" for="menuFoodUrl">Food menu URL</label>
        <input id="menuFoodUrl" v-model="form.menuFoodUrl" type="url" class="input w-full" placeholder="https://…" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" for="menuDrinksUrl">Drinks menu URL</label>
        <input id="menuDrinksUrl" v-model="form.menuDrinksUrl" type="url" class="input w-full" placeholder="https://…" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" for="customDescription">Custom description</label>
        <textarea id="customDescription" v-model="form.customDescription" rows="5" class="input w-full" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium mb-1" for="facebook">Facebook</label>
          <input id="facebook" v-model="form.socialLinks.facebook" type="url" class="input w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="instagram">Instagram</label>
          <input id="instagram" v-model="form.socialLinks.instagram" type="url" class="input w-full" />
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton type="submit" color="amber" label="Save profile" :loading="saving" />
        <UButton to="/dashboard" label="Back" variant="outline" />
      </div>
      <p v-if="savedMessage" class="text-sm text-emerald-700">{{ savedMessage }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const venueId = computed(() => Number.parseInt(String(route.params.venueId), 10))
const { isLoggedIn, initializeAuth } = useAuth()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const savedMessage = ref('')

const form = reactive({
  logoUrl: '',
  headerImageUrl: '',
  menuFoodUrl: '',
  menuDrinksUrl: '',
  customDescription: '',
  socialLinks: {
    facebook: '',
    instagram: '',
    twitter: '',
    tiktok: '',
  },
})

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Edit pub' },
]

async function loadProfile() {
  if (!isLoggedIn.value || !Number.isFinite(venueId.value)) {
    loading.value = false
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const profile = await useAuthFetch<{
      logoUrl: string | null
      headerImageUrl: string | null
      menuFoodUrl: string | null
      menuDrinksUrl: string | null
      customDescription: string | null
      socialLinks: Record<string, string> | null
    }>(`/api/dashboard/venues/${venueId.value}/profile`)

    form.logoUrl = profile.logoUrl || ''
    form.headerImageUrl = profile.headerImageUrl || ''
    form.menuFoodUrl = profile.menuFoodUrl || ''
    form.menuDrinksUrl = profile.menuDrinksUrl || ''
    form.customDescription = profile.customDescription || ''
    const links = profile.socialLinks || {}
    form.socialLinks.facebook = links.facebook || ''
    form.socialLinks.instagram = links.instagram || ''
    form.socialLinks.twitter = links.twitter || ''
    form.socialLinks.tiktok = links.tiktok || ''
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Could not load profile'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  saving.value = true
  savedMessage.value = ''
  errorMessage.value = ''
  try {
    await useAuthFetch(`/api/dashboard/venues/${venueId.value}/profile`, {
      method: 'PUT',
      body: {
        logoUrl: form.logoUrl || null,
        headerImageUrl: form.headerImageUrl || null,
        menuFoodUrl: form.menuFoodUrl || null,
        menuDrinksUrl: form.menuDrinksUrl || null,
        customDescription: form.customDescription || null,
        socialLinks: form.socialLinks,
      },
    })
    savedMessage.value = 'Profile saved.'
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Save failed'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await initializeAuth()
  await loadProfile()
})

useSiteSeo({
  title: 'Edit pub profile',
  description: 'Update your claimed pub listing on UK Pubs.',
  path: `/dashboard/pubs/${venueId.value}`,
})
</script>

<style scoped>
.input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}
</style>
