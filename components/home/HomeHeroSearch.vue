<template>
  <section class="home-hero relative w-full min-h-[380px] max-h-[580px] overflow-hidden bg-gray-900">
    <picture>
      <source
        type="image/avif"
        srcset="/assets/images/hero-home-640.avif 640w, /assets/images/hero-home-960.avif 960w, /assets/images/hero-home-1280.avif 1280w, /assets/images/hero-home-1600.avif 1600w"
        sizes="100vw"
      >
      <source
        type="image/webp"
        srcset="/assets/images/hero-home-640.webp 640w, /assets/images/hero-home-960.webp 960w, /assets/images/hero-home-1280.webp 1280w, /assets/images/hero-home-1600.webp 1600w"
        sizes="100vw"
      >
      <img
        src="/assets/images/hero-home-1280.jpg"
        alt=""
        width="1280"
        height="416"
        fetchpriority="high"
        loading="eager"
        decoding="async"
        class="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
    </picture>
    <div class="home-hero__overlay absolute inset-0 bg-gradient-to-b from-primary-950/55 via-black/35 to-primary-950/70" aria-hidden="true" />

    <div class="relative z-[1] flex min-h-[380px] max-h-[580px] flex-col items-center justify-center px-4 py-10 md:py-14">
      <p class="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-pint">UK Pubs</p>
      <h1 class="mb-6 max-w-3xl text-center text-3xl font-semibold tracking-tight text-white drop-shadow-md md:text-5xl">
        Find pubs and venues across the UK
      </h1>

      <AiPromptBox
        ref="promptBox"
        v-model:mode="mode"
        variant="hero"
        allow-toggle
        input-id="home-hero-search-input"
        @submit="onPromptSubmit"
      />

      <p class="mt-4 text-center text-sm text-white/80 drop-shadow">
        {{ hint }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()
const mode = ref<'search' | 'ask'>('search')
const promptBox = ref<{ reset: () => void } | null>(null)

const hint = computed(() =>
  mode.value === 'ask'
    ? 'Try “dog-friendly pubs in Brighton” or “pubs near Anfield”'
    : 'Try “Brighton”, “Manchester”, or your favourite pub name',
)

function resetQuery() {
  mode.value = 'search'
  promptBox.value?.reset()
}

watch(
  () => route.path,
  (path) => {
    if (path === '/') resetQuery()
  },
)

onMounted(() => {
  if (route.path === '/') resetQuery()
})

onActivated(() => {
  if (route.path === '/') resetQuery()
})

function onPromptSubmit(payload: { mode: 'search' | 'ask'; query: string }) {
  if (payload.mode === 'ask') {
    navigateTo({ path: '/ask', query: { q: payload.query } })
    return
  }
  navigateTo({ path: '/search', query: { q: payload.query } })
}
</script>
