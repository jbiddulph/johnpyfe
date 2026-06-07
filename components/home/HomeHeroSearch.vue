<template>
  <section class="home-hero relative w-full min-h-[320px] max-h-[520px] overflow-hidden bg-gray-900">
    <img
      src="/assets/images/filip-andrejevic-QmX5lw8StoQ-unsplash.jpg"
      alt=""
      width="1920"
      height="480"
      fetchpriority="high"
      loading="eager"
      decoding="async"
      class="absolute inset-0 h-full w-full object-cover"
      aria-hidden="true"
    />
    <div class="home-hero__overlay absolute inset-0 bg-black/45" aria-hidden="true" />

    <div class="relative z-[1] flex min-h-[320px] max-h-[520px] flex-col items-center justify-center px-4 py-10 md:py-14">
      <p class="mb-2 text-sm font-medium uppercase tracking-widest text-white/80">UK Pubs</p>
      <h1 class="mb-8 max-w-3xl text-center text-3xl font-light text-white drop-shadow-md md:text-5xl">
        Find pubs and venues across the UK
      </h1>

      <form
        class="home-hero__search w-full max-w-3xl"
        role="search"
        aria-label="Search pubs and venues"
        @submit.prevent="submitSearch"
      >
        <div class="relative flex items-center rounded-full bg-white shadow-2xl ring-1 ring-black/5">
          <label for="home-hero-search-input" class="sr-only">Search pubs and venues</label>
          <input
            id="home-hero-search-input"
            v-model="query"
            type="search"
            autocomplete="off"
            placeholder="Search by pub or venue name, town, or county…"
            class="home-hero__input w-full rounded-full border-0 bg-transparent py-4 pl-5 pr-14 text-base text-gray-900 outline-none placeholder:text-gray-500 md:py-5 md:pl-7 md:pr-16 md:text-lg"
          />
          <button
            type="submit"
            class="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-amber-600 text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 md:right-3 md:h-11 md:w-11"
            :disabled="!canSearch"
            aria-label="Search"
          >
            <UIcon name="i-heroicons-magnifying-glass-20-solid" class="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
      </form>

      <p class="mt-4 text-center text-sm text-white/80 drop-shadow">
        Try “Brighton”, “Manchester”, or your favourite pub name
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()
const query = ref('')

const canSearch = computed(() => query.value.trim().length >= 2)

function resetQuery() {
  query.value = ''
}

watch(
  () => route.path,
  (path) => {
    if (path === '/') {
      resetQuery()
    }
  },
  { immediate: true },
)

onActivated(() => {
  if (route.path === '/') {
    resetQuery()
  }
})

function submitSearch() {
  const q = query.value.trim()
  if (q.length < 2) return
  navigateTo({ path: '/venues', query: { q } })
}
</script>

<style scoped>
.home-hero__search input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.home-hero__input {
  -webkit-appearance: none;
  appearance: none;
}
</style>
