<template>
  <div>
    <h2>Map Filters</h2>
    <div class="overflow-y-auto h-[550px] flex flex-row flex-wrap justify-center">
      <div v-for="(venue, index) in venuecounties" :key="index" class="pr-2 pb-2">
        <label><input type="checkbox" v-model="venue.checked" @change="toggleMarkers(venue)">
        {{ venue.county }}</label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  fsa_id: Number,
  venuecounties: Array,
})
</script>

<style scoped>

</style>