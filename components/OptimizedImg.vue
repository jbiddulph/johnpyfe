<template>
  <NuxtImg
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :sizes="sizes"
    :preload="preload"
    :loading="loading"
    :fetchpriority="fetchpriority || undefined"
    :densities="densities"
    format="webp"
    quality="75"
    :class="imgClass"
    decoding="async"
    @error="$emit('error', $event)"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  alt?: string
  width?: number | string
  height?: number | string
  sizes?: string
  preload?: boolean
  loading?: 'lazy' | 'eager'
  fetchpriority?: 'high' | 'low' | 'auto'
  densities?: string
  imgClass?: string
}>(), {
  alt: '',
  sizes: '100vw',
  preload: false,
  loading: 'lazy',
  densities: '1',
  imgClass: '',
})

defineEmits<{
  error: [event: Event]
}>()
</script>
