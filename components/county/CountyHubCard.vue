<template>
  <NuxtLink :to="county.href" class="county-hub-card block overflow-hidden rounded-lg shadow-sm transition-transform hover:-translate-y-0.5">
    <div
      class="county-hub-card__media relative min-h-[160px] bg-cover bg-center"
      :class="{ 'county-hub-card__media--fallback': !county.imageUrl }"
      :style="mediaStyle"
    >
      <div class="county-hub-card__overlay" aria-hidden="true" />
      <div class="county-hub-card__content relative z-[1] flex min-h-[160px] flex-col justify-end p-4 text-white">
        <span class="text-xl font-semibold leading-tight">{{ county.displayName }}</span>
        <span class="mt-1 text-sm text-white/90">
          {{ county.venueCount }} {{ county.venueCount === 1 ? 'venue' : 'venues' }}
        </span>
        <span v-if="county.imageAttribution" class="mt-2 text-[10px] text-white/70 line-clamp-1">
          Photo: {{ county.imageAttribution }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  county: {
    href: string
    displayName: string
    venueCount: number
    imageUrl?: string | null
    imageAttribution?: string | null
  }
}>()

const mediaStyle = computed(() =>
  props.county.imageUrl
    ? { backgroundImage: `url('${props.county.imageUrl}')` }
    : undefined,
)
</script>

<style scoped>
.county-hub-card__media--fallback {
  background-image: linear-gradient(135deg, #374151 0%, #111827 100%);
}

.county-hub-card__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
}
</style>
