<template>
  <section class="home-hero relative w-full min-h-[360px] max-h-[600px] overflow-hidden bg-gray-900">
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

    <div class="relative z-[1] flex min-h-[360px] max-h-[600px] flex-col items-center justify-center px-4 py-10 md:py-14">
      <p class="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-pint">UK Pubs</p>
      <h1 class="mb-6 max-w-3xl text-center text-3xl font-semibold tracking-tight text-white drop-shadow-md md:text-5xl">
        Find pubs and venues across the UK
      </h1>

      <div class="mb-5 flex rounded-full bg-black/30 p-1 ring-1 ring-white/20" role="tablist" aria-label="Find pubs">
        <button
          type="button"
          role="tab"
          class="rounded-full px-4 py-1.5 text-sm font-semibold transition md:px-5"
          :class="mode === 'search' ? 'bg-white text-stone-900 shadow' : 'text-white/80 hover:text-white'"
          :aria-selected="mode === 'search'"
          @click="mode = 'search'"
        >
          Search
        </button>
        <button
          type="button"
          role="tab"
          class="rounded-full px-4 py-1.5 text-sm font-semibold transition md:px-5"
          :class="mode === 'ask' ? 'bg-pint text-stone-900 shadow' : 'text-white/80 hover:text-white'"
          :aria-selected="mode === 'ask'"
          @click="mode = 'ask'"
        >
          Ask AI
        </button>
      </div>

      <form
        class="home-hero__search w-full max-w-3xl"
        :role="mode === 'search' ? 'search' : undefined"
        :aria-label="mode === 'search' ? 'Search pubs and venues' : 'Ask anything about UK pubs'"
        @submit.prevent="submitHero"
      >
        <div class="relative flex items-center rounded-full bg-white shadow-2xl ring-1 ring-black/5">
          <label for="home-hero-search-input" class="sr-only">
            {{ mode === 'search' ? 'Search pubs and venues' : 'Ask anything about UK pubs' }}
          </label>
          <input
            id="home-hero-search-input"
            v-model="query"
            :type="mode === 'search' ? 'search' : 'text'"
            autocomplete="off"
            :placeholder="mode === 'search'
              ? 'Search by pub or venue name, town, or county…'
              : 'Ask anything — dog-friendly pubs in Brighton, gigs this weekend…'"
            class="home-hero__input w-full rounded-full border-0 bg-transparent py-4 pl-5 pr-14 text-base text-gray-900 outline-none placeholder:text-gray-500 md:py-5 md:pl-7 md:pr-16 md:text-lg"
          />
          <button
            type="submit"
            class="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-pint text-stone-900 transition hover:bg-pint-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:right-3 md:h-11 md:w-11"
            :disabled="!canSearch"
            :aria-label="mode === 'search' ? 'Search' : 'Ask AI'"
          >
            <UIcon
              :name="mode === 'search' ? 'i-heroicons-magnifying-glass-20-solid' : 'i-heroicons-sparkles-20-solid'"
              class="h-5 w-5 md:h-6 md:w-6"
            />
          </button>
        </div>
      </form>

      <p class="mt-4 text-center text-sm text-white/80 drop-shadow">
        <template v-if="mode === 'search'">Try “Brighton”, “Manchester”, or your favourite pub name</template>
        <template v-else>Ask in plain English — we look up live listings, not invented pubs</template>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()
const query = ref('')
const mode = ref<'search' | 'ask'>('search')

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

function submitHero() {
  const q = query.value.trim()
  if (q.length < 2) return
  if (mode.value === 'ask') {
    navigateTo({ path: '/ask', query: { q } })
    return
  }
  navigateTo({ path: '/search', query: { q } })
}
</script>
