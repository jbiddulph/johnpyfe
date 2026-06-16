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
      <VenueHeaderUpload
        v-model="form.headerImageUrls"
        :venue-id="venueId"
        :preview-urls="headerPreviewUrls"
        @updated="saveProfile"
      />
      <label class="flex items-start gap-3 cursor-pointer">
        <input
          v-model="form.showOriginalVenueImage"
          type="checkbox"
          class="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />
        <span class="text-sm">
          <span class="font-medium text-gray-900 dark:text-gray-100">Show original venue image</span>
          <span class="block text-gray-600 dark:text-gray-400">
            Include the pub’s existing listing photo in the header carousel on your public page.
          </span>
        </span>
      </label>
      <div
        v-if="form.showOriginalVenueImage && originalVenuePhotoUrl"
        class="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
      >
        <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Original listing photo preview</p>
        <img
          :src="originalVenuePhotoUrl"
          alt="Original venue listing photo"
          class="aspect-[16/9] w-full max-w-md rounded object-cover"
          loading="lazy"
        />
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
      <p v-if="savedMessage" class="text-sm text-emerald-700">
        {{ savedMessage }}
        <NuxtLink
          v-if="venueSlug"
          :to="venuePath(venueId, venueSlug)"
          class="ml-2 font-medium text-amber-700 hover:underline"
        >
          View your pub page
        </NuxtLink>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { resolveVenuePhotoUrl } from '@/utils/format-venue'

const route = useRoute()
const venueId = computed(() => Number.parseInt(String(route.params.venueId), 10))
const { isLoggedIn, initializeAuth } = useAuth()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const savedMessage = ref('')
const venueSlug = ref('')
const headerPreviewUrls = ref<string[]>([])
const originalVenuePhotoUrl = ref('')

const form = reactive({
  logoUrl: '',
  headerImageUrls: [] as string[],
  showOriginalVenueImage: false,
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
    const status = await useAuthFetch<{
      claims?: Array<{ venueId: number; venue: { slug: string } }>
    }>('/api/billing/status')
    const claim = status.claims?.find((item) => item.venueId === venueId.value)
    venueSlug.value = claim?.venue.slug || ''

    const profile = await useAuthFetch<{
      logoUrl: string | null
      headerImageUrls: string[]
      headerImagePublicUrls: string[]
      showOriginalVenueImage: boolean
      menuFoodUrl: string | null
      menuDrinksUrl: string | null
      customDescription: string | null
      socialLinks: Record<string, string> | null
    }>(`/api/dashboard/venues/${venueId.value}/profile`)

    form.logoUrl = profile.logoUrl || ''
    form.headerImageUrls = profile.headerImageUrls || []
    headerPreviewUrls.value = profile.headerImagePublicUrls || []
    form.showOriginalVenueImage = Boolean(profile.showOriginalVenueImage)
    form.menuFoodUrl = profile.menuFoodUrl || ''
    form.menuDrinksUrl = profile.menuDrinksUrl || ''
    form.customDescription = profile.customDescription || ''
    const links = profile.socialLinks || {}
    form.socialLinks.facebook = links.facebook || ''
    form.socialLinks.instagram = links.instagram || ''
    form.socialLinks.twitter = links.twitter || ''
    form.socialLinks.tiktok = links.tiktok || ''

    const venue = await $fetch<{ photo?: string }>(useApiUrl(`/api/venues/${venueId.value}`))
    const config = useRuntimeConfig()
    originalVenuePhotoUrl.value = resolveVenuePhotoUrl(venue?.photo, {
      venueImgFolder: config.public.venueImgFolder,
      supabaseUrl: config.public.supabase?.url,
    }) || ''
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
        headerImageUrls: form.headerImageUrls,
        showOriginalVenueImage: form.showOriginalVenueImage,
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
