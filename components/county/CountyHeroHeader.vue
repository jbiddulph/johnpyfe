<template>
  <div class="county-hero w-full">
    <div
      class="county-hero__media relative min-h-[280px] md:min-h-[360px] bg-cover bg-center"
      :class="{ 'county-hero__media--fallback': !imageUrl }"
      :style="mediaStyle"
    >
      <div class="county-hero__overlay" aria-hidden="true" />
      <div class="county-hero__content relative z-[1] flex min-h-[280px] md:min-h-[360px] items-center justify-center px-4 py-10 text-center text-white">
        <div class="max-w-3xl">
          <h1 class="text-4xl md:text-6xl font-light drop-shadow-md">{{ title }}</h1>
          <p v-if="subtitle" class="mt-3 text-lg text-white/90 drop-shadow-md">{{ subtitle }}</p>
          <p v-if="imageAttribution" class="mt-4 text-xs text-white/70">Photo: {{ imageAttribution }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle?: string
  imageUrl?: string | null
  imageAttribution?: string | null
}>()

const mediaStyle = computed(() =>
  props.imageUrl ? { backgroundImage: `url('${props.imageUrl}')` } : undefined,
)
</script>

<style scoped>
.county-hero__media--fallback {
  background-image: linear-gradient(135deg, #374151 0%, #111827 100%);
}

.county-hero__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
}
</style>
