<template>
  <div class="container mx-auto p-4 my-8 max-w-4xl">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1 class="text-4xl font-bold mb-6">Edit pub profile</h1>

    <p v-if="!isLoggedIn" class="text-gray-600">
      <NuxtLink to="/login" class="text-blue-600 hover:underline">Sign in</NuxtLink> to edit this pub.
    </p>
    <p v-else-if="loading" class="text-gray-600">Loading…</p>
    <p v-else-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

    <form v-else class="space-y-8" @submit.prevent="saveProfile">
      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-gray-200 pb-2 dark:border-gray-700">Pub details</h2>
        <div>
          <label class="block text-sm font-medium mb-1" for="venuename">Pub name</label>
          <input id="venuename" v-model="listing.venuename" type="text" required class="input w-full" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium mb-1" for="town">Town</label>
            <input id="town" v-model="listing.town" type="text" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" for="county">County</label>
            <input id="county" v-model="listing.county" type="text" class="input w-full" />
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium mb-1" for="postcode">Postcode</label>
            <input id="postcode" v-model="listing.postcode" type="text" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" for="telephone">Telephone</label>
            <input id="telephone" v-model="listing.telephone" type="tel" class="input w-full" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="address">Address</label>
          <input id="address" v-model="listing.address" type="text" class="input w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="address2">Address line 2</label>
          <input id="address2" v-model="listing.address2" type="text" class="input w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="website">Website</label>
          <input id="website" v-model="listing.website" type="url" class="input w-full" placeholder="https://…" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="description">Description</label>
          <textarea id="description" v-model="listing.description" rows="6" class="input w-full" />
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-gray-200 pb-2 dark:border-gray-700">Location</h2>
        <ClientOnly>
          <VenueLocationPicker
            v-model:latitude="listing.latitude"
            v-model:longitude="listing.longitude"
          />
        </ClientOnly>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-gray-200 pb-2 dark:border-gray-700">Search &amp; SEO</h2>
        <div class="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">AI SEO assistant</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ seoSummaryLabel }}</p>
            </div>
            <UButton
              color="blue"
              label="Improve SEO with AI"
              :loading="seoGenerating"
              @click="generateSeoDraft"
            />
          </div>

          <div v-if="latestSeoChanges" class="mt-4 space-y-3 border-t border-blue-100 pt-4 text-sm dark:border-blue-900">
            <div v-if="latestSeoChanges.pageTitle">
              <p class="font-medium text-gray-700 dark:text-gray-200">Suggested title</p>
              <p class="text-gray-600 dark:text-gray-400">{{ latestSeoChanges.pageTitle }}</p>
            </div>
            <div v-if="latestSeoChanges.metaDescription">
              <p class="font-medium text-gray-700 dark:text-gray-200">Suggested meta description</p>
              <p class="text-gray-600 dark:text-gray-400">{{ latestSeoChanges.metaDescription }}</p>
            </div>
            <div v-if="latestSeoChanges.description">
              <p class="font-medium text-gray-700 dark:text-gray-200">Suggested description</p>
              <p class="text-gray-600 dark:text-gray-400">{{ latestSeoChanges.description }}</p>
            </div>
            <div v-if="latestSeoChanges.missingContentWarnings?.length">
              <p class="font-medium text-gray-700 dark:text-gray-200">Missing content</p>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
                <li v-for="warning in latestSeoChanges.missingContentWarnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>
            <UButton
              v-if="latestSeoRecommendationId"
              color="emerald"
              variant="outline"
              label="Approve AI changes"
              :loading="seoApproving"
              @click="approveSeoDraft"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="pageTitle">Page title</label>
          <input
            id="pageTitle"
            v-model="form.pageTitle"
            type="text"
            maxlength="100"
            class="input w-full"
            placeholder="e.g. The Red Lion, Worthing"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Shown in the browser tab and Google search results (max 100 characters). “| UK Pubs” is added automatically.
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="metaDescription">Meta description</label>
          <textarea
            id="metaDescription"
            v-model="form.metaDescription"
            rows="3"
            maxlength="500"
            class="input w-full"
            placeholder="Short summary shown in Google search results (max 500 characters)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="seoKeywords">Keywords</label>
          <input
            id="seoKeywords"
            v-model="form.seoKeywords"
            type="text"
            maxlength="500"
            class="input w-full"
            placeholder="e.g. live music, beer garden, Sunday roast"
          />
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-gray-200 pb-2 dark:border-gray-700">Branding &amp; menus</h2>
        <div>
          <label class="block text-sm font-medium mb-1" for="logoUrl">Logo URL</label>
          <input id="logoUrl" v-model="form.logoUrl" type="url" class="input w-full" placeholder="https://…" />
        </div>
        <VenueHeaderUpload
          v-model="form.headerImageUrls"
          :venue-id="venueId"
          @updated="saveBrandingOnly"
        />
        <label class="flex items-start gap-3 cursor-pointer">
          <input
            v-model="form.showOriginalVenueImage"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
          <label class="block text-sm font-medium mb-1" for="customDescription">About section override</label>
          <textarea
            id="customDescription"
            v-model="form.customDescription"
            rows="4"
            class="input w-full"
            placeholder="Optional — replaces the description above on your public page when filled in"
          />
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
      </section>

      <div class="flex flex-wrap gap-3">
        <UButton type="submit" color="blue" label="Save changes" :loading="saving" />
        <UButton to="/dashboard" label="Back" variant="outline" />
      </div>
      <p v-if="savedMessage" class="text-sm text-emerald-700">
        {{ savedMessage }}
        <NuxtLink
          v-if="venueSlug"
          :to="venuePath(venueId, venueSlug)"
          class="ml-2 font-medium text-blue-700 hover:underline"
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
const originalVenuePhotoUrl = ref('')
const seoGenerating = ref(false)
const seoApproving = ref(false)
const seoImprovementCount = ref(0)
const latestSeoRecommendationId = ref('')
const latestSeoChanges = ref<{
  pageTitle?: string
  metaDescription?: string
  description?: string
  missingContentWarnings?: string[]
} | null>(null)

const listing = reactive({
  venuename: '',
  town: '',
  county: '',
  postcode: '',
  address: '',
  address2: '',
  telephone: '',
  website: '',
  description: '',
  latitude: '',
  longitude: '',
})

const form = reactive({
  logoUrl: '',
  headerImageUrls: [] as string[],
  showOriginalVenueImage: false,
  menuFoodUrl: '',
  menuDrinksUrl: '',
  customDescription: '',
  pageTitle: '',
  metaDescription: '',
  seoKeywords: '',
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

const seoSummaryLabel = computed(() =>
  seoImprovementCount.value > 0
    ? `${seoImprovementCount.value} SEO improvement${seoImprovementCount.value === 1 ? '' : 's'} available`
    : 'Generate search titles, descriptions, FAQs, keywords, and missing-content checks.',
)

function applyListing(data: {
  venuename: string
  town: string
  county: string
  postcode: string
  address: string
  address2: string
  telephone: string
  website: string
  description: string | null
  latitude: string
  longitude: string
  slug: string
}) {
  listing.venuename = data.venuename || ''
  listing.town = data.town || ''
  listing.county = data.county || ''
  listing.postcode = data.postcode || ''
  listing.address = data.address || ''
  listing.address2 = data.address2 || ''
  listing.telephone = data.telephone || ''
  listing.website = data.website || ''
  listing.description = data.description || ''
  listing.latitude = data.latitude || ''
  listing.longitude = data.longitude || ''
  venueSlug.value = data.slug || venueSlug.value
}

function applyProfile(profile: {
  logoUrl: string | null
  headerImageUrls: string[]
  showOriginalVenueImage: boolean
  menuFoodUrl: string | null
  menuDrinksUrl: string | null
  customDescription: string | null
  pageTitle: string | null
  metaDescription: string | null
  seoKeywords: string | null
  socialLinks: Record<string, string> | null
}) {
  form.logoUrl = profile.logoUrl || ''
  form.headerImageUrls = profile.headerImageUrls || []
  form.showOriginalVenueImage = Boolean(profile.showOriginalVenueImage)
  form.menuFoodUrl = profile.menuFoodUrl || ''
  form.menuDrinksUrl = profile.menuDrinksUrl || ''
  form.customDescription = profile.customDescription || ''
  form.pageTitle = profile.pageTitle || ''
  form.metaDescription = profile.metaDescription || ''
  form.seoKeywords = profile.seoKeywords || ''
  const links = profile.socialLinks || {}
  form.socialLinks.facebook = links.facebook || ''
  form.socialLinks.instagram = links.instagram || ''
  form.socialLinks.twitter = links.twitter || ''
  form.socialLinks.tiktok = links.tiktok || ''
}

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

    const [listingData, profile] = await Promise.all([
      useAuthFetch<Parameters<typeof applyListing>[0]>(`/api/dashboard/venues/${venueId.value}/listing`),
      useAuthFetch<Parameters<typeof applyProfile>[0]>(`/api/dashboard/venues/${venueId.value}/profile`),
    ])

    applyListing(listingData)
    applyProfile(profile)
    await loadSeoSummary()

    try {
      const venue = await $fetch<{ photo?: string }>(`/api/venues/${venueId.value}`)
      const config = useRuntimeConfig()
      originalVenuePhotoUrl.value = resolveVenuePhotoUrl(venue?.photo, {
        venueImgFolder: config.public.venueImgFolder,
        supabaseUrl: config.public.supabase?.url,
      }) || ''
    } catch {
      originalVenuePhotoUrl.value = ''
    }
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Could not load profile'
  } finally {
    loading.value = false
  }
}

async function loadSeoSummary() {
  try {
    const summary = await useAuthFetch<{
      improvementCount: number
      latestRecommendation?: {
        id: string
        changes: typeof latestSeoChanges.value
      } | null
    }>(`/api/ai/venues/${venueId.value}/seo-summary`)

    seoImprovementCount.value = summary.improvementCount || 0
    latestSeoRecommendationId.value = summary.latestRecommendation?.id || ''
    latestSeoChanges.value = summary.latestRecommendation?.changes || null
  } catch {
    seoImprovementCount.value = 0
    latestSeoRecommendationId.value = ''
    latestSeoChanges.value = null
  }
}

async function generateSeoDraft() {
  seoGenerating.value = true
  savedMessage.value = ''
  errorMessage.value = ''
  try {
    await useAuthFetch('/api/ai', {
      method: 'POST',
      body: {
        venueId: venueId.value,
        action: 'analyseSeo',
      },
    })
    await loadSeoSummary()
    savedMessage.value = 'AI SEO draft generated.'
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Could not generate SEO draft'
  } finally {
    seoGenerating.value = false
  }
}

async function approveSeoDraft() {
  if (!latestSeoRecommendationId.value) return
  seoApproving.value = true
  savedMessage.value = ''
  errorMessage.value = ''
  try {
    await useAuthFetch('/api/ai', {
      method: 'POST',
      body: {
        venueId: venueId.value,
        action: 'approveSeoRecommendation',
        recommendationId: latestSeoRecommendationId.value,
      },
    })
    await loadProfile()
    savedMessage.value = 'AI SEO changes approved.'
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Could not approve SEO changes'
  } finally {
    seoApproving.value = false
  }
}

async function saveBrandingOnly() {
  saving.value = true
  savedMessage.value = ''
  errorMessage.value = ''
  try {
    await useAuthFetch(`/api/dashboard/venues/${venueId.value}/profile`, {
      method: 'PUT',
      body: brandingPayload(),
    })
    savedMessage.value = 'Profile saved.'
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Save failed'
  } finally {
    saving.value = false
  }
}

function brandingPayload() {
  return {
    logoUrl: form.logoUrl || null,
    headerImageUrls: form.headerImageUrls,
    showOriginalVenueImage: form.showOriginalVenueImage,
    menuFoodUrl: form.menuFoodUrl || null,
    menuDrinksUrl: form.menuDrinksUrl || null,
    customDescription: form.customDescription || null,
    pageTitle: form.pageTitle || null,
    metaDescription: form.metaDescription || null,
    seoKeywords: form.seoKeywords || null,
    socialLinks: form.socialLinks,
  }
}

async function saveProfile() {
  saving.value = true
  savedMessage.value = ''
  errorMessage.value = ''
  try {
    const updatedListing = await useAuthFetch<Parameters<typeof applyListing>[0]>(
      `/api/dashboard/venues/${venueId.value}/listing`,
      {
        method: 'PUT',
        body: {
          venuename: listing.venuename,
          town: listing.town,
          county: listing.county,
          postcode: listing.postcode,
          address: listing.address,
          address2: listing.address2,
          telephone: listing.telephone,
          website: listing.website,
          description: listing.description || null,
          latitude: listing.latitude || null,
          longitude: listing.longitude || null,
        },
      },
    )
    applyListing(updatedListing)

    await useAuthFetch(`/api/dashboard/venues/${venueId.value}/profile`, {
      method: 'PUT',
      body: brandingPayload(),
    })
    savedMessage.value = 'Changes saved.'
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
