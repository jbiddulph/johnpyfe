<template>
  <div
    class="venue-header-carousel relative w-full max-h-[480px] overflow-hidden bg-gray-200 dark:bg-gray-700"
    @mouseenter="pauseAuto"
    @mouseleave="resumeAuto"
    @focusin="pauseAuto"
    @focusout="resumeAuto"
  >
    <div class="venue-header-carousel__track relative aspect-[5/2] max-h-[480px] w-full sm:aspect-[5/2]">
      <Transition :name="transitionName" mode="out-in">
        <img
          :key="currentSrc"
          :src="currentSrc"
          :alt="alt"
          width="1200"
          height="480"
          :fetchpriority="activeIndex === 0 ? 'high' : 'auto'"
          :loading="activeIndex === 0 ? 'eager' : 'lazy'"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover"
        />
      </Transition>
    </div>

    <template v-if="hasMultiple">
      <button
        type="button"
        class="venue-header-carousel__nav venue-header-carousel__nav--prev"
        aria-label="Previous image"
        @click="goPrev"
      >
        <UIcon name="i-heroicons-chevron-left-20-solid" class="h-6 w-6" />
      </button>
      <button
        type="button"
        class="venue-header-carousel__nav venue-header-carousel__nav--next"
        aria-label="Next image"
        @click="goNext"
      >
        <UIcon name="i-heroicons-chevron-right-20-solid" class="h-6 w-6" />
      </button>

      <div class="venue-header-carousel__dots" role="tablist" aria-label="Header images">
        <button
          v-for="(_, index) in images"
          :key="index"
          type="button"
          role="tab"
          class="venue-header-carousel__dot"
          :class="{ 'venue-header-carousel__dot--active': index === activeIndex }"
          :aria-selected="index === activeIndex"
          :aria-label="`Image ${index + 1} of ${images.length}`"
          @click="goTo(index)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  images: string[]
  alt: string
  transition?: 'fade' | 'slide'
  autoPlayMs?: number
}>(), {
  transition: 'fade',
  autoPlayMs: 6000,
})

const activeIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const hasMultiple = computed(() => props.images.length > 1)
const currentSrc = computed(() => props.images[activeIndex.value] || props.images[0] || '')
const transitionName = computed(() =>
  props.transition === 'slide' ? 'venue-header-slide' : 'venue-header-fade',
)

function goTo(index: number) {
  if (!props.images.length) return
  activeIndex.value = (index + props.images.length) % props.images.length
}

function goNext() {
  goTo(activeIndex.value + 1)
}

function goPrev() {
  goTo(activeIndex.value - 1)
}

function pauseAuto() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function resumeAuto() {
  pauseAuto()
  if (!hasMultiple.value || !props.autoPlayMs) return
  timer = setInterval(goNext, props.autoPlayMs)
}

watch(() => props.images, () => {
  if (activeIndex.value >= props.images.length) {
    activeIndex.value = 0
  }
})

onMounted(resumeAuto)
onUnmounted(pauseAuto)
</script>

<style scoped>
.venue-header-carousel__nav {
  @apply absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white;
}

.venue-header-carousel__nav--prev {
  left: 0.75rem;
}

.venue-header-carousel__nav--next {
  right: 0.75rem;
}

.venue-header-carousel__dots {
  @apply absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2;
}

.venue-header-carousel__dot {
  @apply h-2.5 w-2.5 rounded-full bg-white/50 transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white;
}

.venue-header-carousel__dot--active {
  @apply bg-white scale-110;
}

.venue-header-fade-enter-active,
.venue-header-fade-leave-active {
  transition: opacity 0.55s ease;
}

.venue-header-fade-enter-from,
.venue-header-fade-leave-to {
  opacity: 0;
}

.venue-header-slide-enter-active,
.venue-header-slide-leave-active {
  transition: transform 0.45s ease, opacity 0.45s ease;
}

.venue-header-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.venue-header-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
