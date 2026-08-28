<template>
  <section class="my-10" aria-label="Reviews">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-3xl font-bold">Reviews</h2>
        <p v-if="summary.count" class="mt-1 flex flex-wrap items-center gap-2 text-lg text-gray-700 dark:text-gray-300">
          <VenueStarRating :model-value="summary.average" readonly />
          <span>
            {{ summary.average?.toFixed(1) }} from {{ summary.count }}
            review{{ summary.count === 1 ? '' : 's' }}
          </span>
        </p>
        <p v-else class="mt-1 text-lg text-gray-600 dark:text-gray-400">
          No reviews yet — be the first to rate this pub.
        </p>
      </div>
    </div>

    <div
      class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 md:p-5"
    >
      <template v-if="isLoggedIn">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ myReview ? 'Update your review' : 'Leave a review' }}
        </h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Rate this venue from 1 to 5 stars. A comment is optional.
        </p>
        <div class="mt-3">
          <VenueStarRating v-model="formRating" size="lg" />
        </div>
        <label class="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300" for="venue-review-comment">
          Comment
        </label>
        <textarea
          id="venue-review-comment"
          v-model="formComment"
          rows="4"
          maxlength="2000"
          class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-blue-500 focus:border-blue-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="What was the pint like? Atmosphere, staff, food…"
        />
        <p class="mt-1 text-right text-xs text-gray-500">{{ formComment.length }}/2000</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            color="blue"
            :label="myReview ? 'Save review' : 'Post review'"
            :loading="saving"
            :disabled="!formRating"
            @click="submitReview"
          />
          <UButton
            v-if="myReview"
            color="gray"
            variant="soft"
            label="Remove review"
            :loading="removing"
            @click="removeReview"
          />
        </div>
      </template>
      <template v-else>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Been here?</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Sign in to leave a five-star review and save this pub to your favourites.
        </p>
        <UButton class="mt-3" color="blue" label="Sign in to review" :to="loginRedirect" />
      </template>
      <p v-if="message" class="mt-3 text-sm" :class="messageIsError ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'">
        {{ message }}
      </p>
    </div>

    <ul v-if="reviews.length" class="mt-6 space-y-4 list-none p-0 m-0">
      <li
        v-for="review in reviews"
        :key="review.id"
        class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">
              {{ review.author.displayName }}
              <span v-if="review.author.username" class="font-normal text-sm text-gray-500">
                @{{ review.author.username }}
              </span>
              <span
                v-if="myReview && review.id === myReview.id"
                class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              >
                You
              </span>
            </p>
            <VenueStarRating class="mt-1" :model-value="review.rating" readonly size="sm" />
          </div>
          <time class="text-sm text-gray-500" :datetime="review.createdAt">
            {{ formatReviewDate(review.createdAt) }}
          </time>
        </div>
        <p v-if="review.comment" class="mt-3 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {{ review.comment }}
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { fetchErrorMessage } from '@/utils/fetch-error'
import type { ReviewSummary, SerializedReview, VenueReviewsPayload } from '@/types/venue-social'

const props = defineProps<{
  venueId: number
  initialSummary?: ReviewSummary | null
  initialReviews?: SerializedReview[]
  initialMyReview?: SerializedReview | null
}>()

const emit = defineEmits<{
  updated: [payload: VenueReviewsPayload]
}>()

const route = useRoute()
const { isLoggedIn, initializeAuth } = useAuth()

const summary = ref<ReviewSummary>(props.initialSummary || { average: null, count: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
const reviews = ref<SerializedReview[]>(props.initialReviews || [])
const myReview = ref<SerializedReview | null>(props.initialMyReview || null)
const formRating = ref(props.initialMyReview?.rating || 0)
const formComment = ref(props.initialMyReview?.comment || '')
const saving = ref(false)
const removing = ref(false)
const message = ref('')
const messageIsError = ref(false)

const loginRedirect = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))

function applyPayload(payload: VenueReviewsPayload) {
  summary.value = payload.summary
  reviews.value = payload.reviews
  myReview.value = payload.myReview
  if (payload.myReview) {
    formRating.value = payload.myReview.rating
    formComment.value = payload.myReview.comment
  }
  emit('updated', payload)
}

async function loadReviews() {
  try {
    const payload = isLoggedIn.value
      ? await useAuthFetch<VenueReviewsPayload>(`/api/venues/${props.venueId}/reviews`)
      : await $fetch<VenueReviewsPayload>(`/api/venues/${props.venueId}/reviews`)
    applyPayload(payload)
  } catch {
    /* public page still works without reviews table */
  }
}

async function submitReview() {
  if (!formRating.value) return
  saving.value = true
  message.value = ''
  messageIsError.value = false
  const wasUpdate = Boolean(myReview.value)
  try {
    const payload = await useAuthFetch<VenueReviewsPayload>(`/api/venues/${props.venueId}/reviews`, {
      method: 'POST',
      body: { rating: formRating.value, comment: formComment.value },
    })
    applyPayload(payload)
    message.value = wasUpdate ? 'Review updated' : 'Thanks for your review'
  } catch (error: unknown) {
    messageIsError.value = true
    message.value = fetchErrorMessage(error, 'Could not save review')
  } finally {
    saving.value = false
  }
}

async function removeReview() {
  removing.value = true
  message.value = ''
  messageIsError.value = false
  try {
    const payload = await useAuthFetch<VenueReviewsPayload>(
      `/api/venues/${props.venueId}/reviews`,
      { method: 'DELETE' },
    )
    applyPayload(payload)
    formRating.value = 0
    formComment.value = ''
    message.value = 'Your review was removed'
  } catch (error: unknown) {
    messageIsError.value = true
    message.value = fetchErrorMessage(error, 'Could not remove review')
  } finally {
    removing.value = false
  }
}

function formatReviewDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  await initializeAuth()
  await loadReviews()
})

watch(isLoggedIn, () => {
  loadReviews()
})
</script>
