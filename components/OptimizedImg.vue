<template>
  <img
    v-if="useOriginalSrc"
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="loading"
    :fetchpriority="fetchpriority || undefined"
    decoding="async"
    :class="imgClass"
    @error="$emit('error', $event)"
  >
  <NuxtImg
    v-else
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :sizes="parsedSizes"
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
import { isRemoteImageSrc, nuxtImageSizes } from '@/utils/optimized-img'

const props = withDefaults(defineProps<{
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
  preload: false,
  loading: 'lazy',
  densities: '1',
  imgClass: '',
})

defineEmits<{
  error: [event: Event]
}>()

const useOriginalSrc = computed(() => isRemoteImageSrc(props.src))
const parsedSizes = computed(() => nuxtImageSizes(props.sizes))
</script>
