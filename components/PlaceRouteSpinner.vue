<template>
  <Teleport to="body">
    <Transition name="place-route-spinner-fade">
      <div
        v-if="loading"
        class="place-route-spinner"
        role="status"
        aria-live="polite"
        aria-label="Loading page"
      >
        <div class="place-route-spinner__backdrop" />
        <div class="place-route-spinner__content">
          <div class="place-route-spinner__ring" aria-hidden="true" />
          <p class="place-route-spinner__label">{{ label }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps({
  label: {
    type: String,
    default: 'Loading…',
  },
})

const loading = useState<boolean>('place-route-loading', () => false)
</script>
