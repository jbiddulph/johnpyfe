<template>
  <div class="pagination">
    <button 
      v-for="page in totalPages" 
      :key="page"
      :class="{ active: page === currentPage }"
      @click="handlePageChange(page)"
    >
      {{ page }}
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  totalPages: Number,
  currentPage: Number
});

function handlePageChange(page) {
  if (page !== currentPage) {
    // Emit an event to notify the parent component of the page change
    emit('change', page);
  }
}
</script>

<style scoped>
.pagination {
  display: flex;
}

.pagination button {
  margin: 0 5px;
  padding: 5px 10px;
  border: 1px solid #ccc;
  cursor: pointer;
}

.pagination button.active {
  background-color: #ccc;
}
</style>
