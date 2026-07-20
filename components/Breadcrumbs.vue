<template>
  <nav aria-label="Breadcrumb" class="mb-6">
    <ol class="flex flex-wrap items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
      <li v-for="(item, index) in items" :key="index" class="flex items-center gap-1">
        <span v-if="index > 0" class="text-gray-400" aria-hidden="true">/</span>
        <NuxtLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-500"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          class="font-medium text-gray-900 dark:text-gray-100"
          :aria-current="index === items.length - 1 ? 'page' : undefined"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export type BreadcrumbItem = {
  label: string
  to?: string
}

defineProps<{
  items: BreadcrumbItem[]
}>()
</script>
