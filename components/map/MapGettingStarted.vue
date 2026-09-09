<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="-translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-2 opacity-0"
  >
    <div
      v-if="visible"
      class="map-getting-started pointer-events-auto absolute left-3 top-3 z-10 w-[min(22rem,calc(100%-1.5rem))] rounded-xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95"
      role="region"
      aria-label="How to use the pub map"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">Getting started</p>
          <h2 class="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">Find a pub, start a crawl</h2>
        </div>
        <UButton
          color="gray"
          variant="ghost"
          size="xs"
          icon="i-heroicons-x-mark-20-solid"
          aria-label="Dismiss map instructions"
          @click="$emit('dismiss')"
        />
      </div>

      <ol class="mt-3 space-y-2.5 text-sm text-gray-700 dark:text-gray-200">
        <li class="flex gap-3">
          <span class="step-badge">1</span>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Zoom in to find a pub</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Scroll, pinch or pick a town from the search box. Clusters split into pubs as you zoom.</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="step-badge">2</span>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Select a pub</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Hover for the address and distance from you; click for details and events.</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="step-badge">3</span>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Start a pub crawl &amp; invite friends</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Make that pub your first stop, add more, then invite mates by username.</p>
          </div>
        </li>
      </ol>

      <div class="mt-4 flex flex-wrap gap-2">
        <UButton
          size="sm"
          color="primary"
          icon="i-heroicons-viewfinder-circle-20-solid"
          :label="locating ? 'Finding you…' : 'Pubs near me'"
          :loading="locating"
          @click="$emit('locate')"
        />
        <UButton
          size="sm"
          color="gray"
          variant="soft"
          icon="i-heroicons-magnifying-glass-20-solid"
          label="Search a town"
          @click="$emit('search-town')"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  locating?: boolean
}>()

defineEmits<{
  dismiss: []
  locate: []
  'search-town': []
}>()
</script>

<style scoped>
.step-badge {
  @apply mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white;
}
</style>
