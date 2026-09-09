<template>
  <NuxtLink :to="venuePath(venue.id, venue.slug)" class="venue-card-media block bg-gray-100">
    <OptimizedImg
      :src="photoUrl"
      :alt="imageAlt"
      img-class="venue-card-media__img"
      width="400"
      height="180"
      sizes="sm:50vw md:25vw"
      loading="lazy"
    />
  </NuxtLink>
</template>

<script setup lang="ts">
import { cleanDbString, formatPlaceName, resolveVenueDisplayPhotoUrl } from '@/utils/format-venue'
import { venueImageAlt } from '@/utils/site-seo-copy'

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

const imageAlt = useSiteSeoTemplateText(
  'venue',
  'imageAltTemplate',
  () => ({
    venue: formatPlaceName(props.venue?.venuename),
    town: formatPlaceName(props.venue?.town),
    county: formatPlaceName(props.venue?.county),
    postcode: cleanDbString(props.venue?.postcode) ?? '',
    venueType: cleanDbString(props.venue?.venuetype) ?? '',
  }),
  () => venueImageAlt(props.venue?.venuename, props.venue?.town, props.venue?.county),
)
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
