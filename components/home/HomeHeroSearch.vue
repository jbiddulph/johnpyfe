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
        <div class="flex items-stretch overflow-hidden rounded-full bg-white shadow-2xl ring-1 ring-black/5">
          <label for="home-hero-search-input" class="sr-only">Search pubs and venues</label>
          <input
            id="home-hero-search-input"
            v-model="query"
            type="search"
            autocomplete="off"
            placeholder="Search by pub or venue name, town, or county…"
            class="min-w-0 flex-1 border-0 bg-transparent px-5 py-4 text-base text-gray-900 outline-none placeholder:text-gray-500 md:px-7 md:py-5 md:text-lg"
          />
          <button
            type="submit"
            class="home-hero__submit shrink-0 bg-amber-600 px-6 text-sm font-semibold text-white transition hover:bg-amber-700 md:px-10 md:text-base"
            :disabled="!canSearch"
          >
            Search
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
const query = ref('')

const canSearch = computed(() => query.value.trim().length >= 2)

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
</style>
