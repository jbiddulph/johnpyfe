<!-- @deprecated Use PlaceHeaderMap -->
<template>
  <PlaceHeaderMap :place-name="townName" :venues="venues" />
</template>

<script setup>
defineProps({
  townName: { type: String, required: true },
  venues: { type: Array, default: () => [] },
})
</script>
