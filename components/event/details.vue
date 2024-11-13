<template>
<div>
  <div>
    <img class="w-auto h-auto mr-4" :src="`${config.public.supabase.url}/storage/v1/object/public/event_images/${contentDetails.photo}`" alt="Event image" width="250px" />
  </div>
  <div class="flex flex-row">
    <div class="col1">
      <h2 class="text-4xl">{{ contentDetails.event_title }}</h2>
      <p>{{ contentDetails.description}}</p>
      <p>{{ contentDetails.cost}}</p>
      <p>{{ contentDetails.duration}}</p>
      <p>{{ contentDetails.event_start}}</p>
      <p>{{ contentDetails.category}}</p>
      <p>{{ contentDetails.website}}</p>
      <p>{{ contentDetails.created_at}}</p>
    </div>
    <div class="col2">
      <h3 class="text-3xl">{{ venueDetails.value?.venuename }}</h3>
      <p><span>Address: </span>{{ venueDetails.value?.address }}</p>
      <p><span>Address2: </span>{{ venueDetails.value?.address2 }}</p>
      <p><span>Town: </span>{{ venueDetails.value?.town }}</p>
      <p><span>County: </span>{{ venueDetails.value?.county }}</p>
      <p><span>Postcode: </span>{{ venueDetails.value?.postcode }}</p>
      <p><span>Postalsearch: </span>{{ venueDetails.value?.postalsearch }}</p>
      <p><span>Local Authority: </span>{{ venueDetails.value?.local_authority }}</p>
      <p><span>Longitude: </span>{{ venueDetails.value?.longitude }}</p>
      <p><span>Latitude: </span>{{ venueDetails.value?.latitude }}</p>
      <p><span>Venuetype: </span>{{ venueDetails .value?.venuetype }}</p>
    </div>
  </div>
</div>
</template>
<script setup lang="ts">
const props = defineProps<{
  content: Object,
  venue: Object
}>();
const config = useRuntimeConfig()
const { content: contentDetails, venue: venueDetails } = props;
</script>

<style scoped>

</style>