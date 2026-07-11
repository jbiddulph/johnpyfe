<template>
  <div class="relative my-6">
    <div class="absolute inset-0 flex items-center" aria-hidden="true">
      <div class="w-full border-t border-gray-200 dark:border-gray-700" />
    </div>
    <div class="relative flex justify-center text-sm">
      <span class="bg-white px-3 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'or',
})
</script>
