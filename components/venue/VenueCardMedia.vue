<template>
  <NuxtLink :to="venuePath(venue.id, venue.slug)" class="venue-card-media block overflow-hidden rounded-md bg-gray-100">
    <img
      v-if="photoUrl"
      :src="photoUrl"
      :alt="`${venue.venuename} photo`"
      class="venue-card-media__img"
      loading="lazy"
    />
    <img
      v-else-if="staticMapUrl"
      :src="staticMapUrl"
      :alt="`Map location for ${venue.venuename}`"
      class="venue-card-media__img"
      loading="lazy"
    />
    <div v-else class="venue-card-media__placeholder text-sm text-gray-500">
      No photo or map
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { resolveVenuePhotoUrl, venueStaticMapUrl } from '@/utils/format-venue'

const props = defineProps({
  venue: {
    type: Object,
    required: true,
  },
})

const config = useRuntimeConfig()
const mapboxToken = useMapboxToken()

const photoConfig = computed(() => ({
  venueImgFolder: config.public.venueImgFolder as string | undefined,
  supabaseUrl: config.public.supabase?.url as string | undefined,
}))

const photoUrl = computed(() => resolveVenuePhotoUrl(props.venue?.photo, photoConfig.value))

const staticMapUrl = computed(() => {
  if (photoUrl.value) return null
  return venueStaticMapUrl(props.venue, mapboxToken.value, 480, 180)
})
</script>

<style scoped>
.venue-card-media {
  height: 140px;
}

.venue-card-media__img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.venue-card-media__placeholder {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
