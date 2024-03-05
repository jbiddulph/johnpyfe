<template>
  <div class="modal-content">
    {{ content }}
    Edit mode: {{ editing }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  content: Object, // Define a prop named 'greeting' of type String
  editing: Boolean
})
</script>

<style scoped>
.modal-content {
  min-height: 600px; /* Example max height for scrollbar */
  overflow-y: auto; /* Enable vertical scrollbar if content exceeds max height */
  padding: 20px; /* Example padding */
}
</style>