<template>
  <article class="venue-hub-card overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div class="venue-hub-card__header px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <NuxtLink :to="venuePath(venue.id, venue.slug)" class="hub-card__title hover:underline">
        {{ venue.venuename }}
      </NuxtLink>
    </div>
    <VenueCardMedia :venue="venue" />
    <div class="venue-hub-card__body p-4">
      <p v-if="addressLine" class="text-sm text-gray-700 dark:text-gray-300">{{ addressLine }}</p>
      <p v-if="phone" class="text-sm mt-2">
        <a :href="`tel:${phone.replace(/\s/g, '')}`" class="text-amber-600 hover:underline">{{ phone }}</a>
      </p>
      <p v-if="websiteHref" class="text-sm mt-1">
        <a
          :href="websiteHref"
          target="_blank"
          rel="noopener noreferrer"
          class="text-amber-600 hover:underline break-all"
        >
          {{ websiteLabel }}
        </a>
      </p>
    </div>
    <div
      v-if="$slots.footer"
      class="venue-hub-card__footer px-4 py-3 border-t border-gray-100 dark:border-gray-800"
    >
      <slot name="footer" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { cleanDbString, formatPhone, normalizeWebsiteHref } from '@/utils/format-venue'

const props = defineProps({
  venue: {
    type: Object,
    required: true,
  },
})

const addressLine = computed(() =>
  [cleanDbString(props.venue.address), cleanDbString(props.venue.postcode)].filter(Boolean).join(', '),
)

const phone = computed(() => formatPhone(props.venue.telephone))

const websiteHref = computed(() => normalizeWebsiteHref(props.venue.website))

const websiteLabel = computed(() => cleanDbString(props.venue.website) || websiteHref.value)
</script>

<style scoped>
.venue-hub-card__header,
.venue-hub-card__body,
.venue-hub-card__footer {
  margin: 0;
}
</style>
