<template>
  <NuxtLink :to="venuePath(venue.id, venue.slug)" class="venue-card-media block bg-gray-100">
    <img
      :src="photoUrl"
      :alt="`${venue.venuename} photo`"
      class="venue-card-media__img"
      width="400"
      height="180"
      loading="lazy"
      decoding="async"
    />
  </NuxtLink>
</template>

<script setup lang="ts">
import { resolveVenueDisplayPhotoUrl } from '@/utils/format-venue'

const props = defineProps({
  venue: {
    type: Object,
    required: true,
  },
})

const config = useRuntimeConfig()

const photoConfig = computed(() => ({
  venueImgFolder: config.public.venueImgFolder as string | undefined,
  supabaseUrl: config.public.supabase?.url as string | undefined,
}))

const photoUrl = computed(() => resolveVenueDisplayPhotoUrl(props.venue?.photo, photoConfig.value))
</script>

<style scoped>
.venue-card-media {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
}

.venue-card-media__img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

.venue-card-media__placeholder {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
