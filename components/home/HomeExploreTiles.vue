<template>
  <section class="home-explore" aria-labelledby="home-explore-heading">
    <div class="mx-auto mb-8 max-w-3xl text-center">
      <h2 id="home-explore-heading" class="text-3xl font-bold text-gray-900 dark:text-white">
        Everything for a good night out
      </h2>
      <p class="mt-3 text-lg text-gray-600 dark:text-gray-400">
        Discover events, browse by town or county, and find pubs near you — including
        <strong class="font-medium text-gray-700 dark:text-gray-300">sports pubs</strong>,
        coastal towns and Premier League grounds.
      </p>
    </div>

    <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="tile in tiles" :key="tile.to">
        <NuxtLink
          :to="tile.to"
          class="home-explore__tile group flex h-full items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-600"
        >
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            :class="tile.accent"
          >
            <UIcon :name="tile.icon" class="h-6 w-6" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2">
              <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ tile.title }}</span>
              <span
                v-if="tile.badge"
                class="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700 dark:bg-primary-900/50 dark:text-primary-200"
              >
                {{ tile.badge }}
              </span>
            </span>
            <span class="mt-1 block text-sm text-gray-600 dark:text-gray-400">{{ tile.description }}</span>
          </span>
          <UIcon
            name="i-heroicons-arrow-right-20-solid"
            class="mt-1 h-5 w-5 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary-600 dark:text-gray-600"
            aria-hidden="true"
          />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
const tiles = [
  {
    to: '/map',
    icon: 'i-heroicons-map-20-solid',
    title: 'Interactive map',
    description: 'Every pub on one map. Zoom into your town and build a pub crawl as you go.',
    accent: 'bg-primary-600',
    badge: 'New',
  },
  {
    to: '/pub-crawls',
    icon: 'i-heroicons-flag-20-solid',
    title: 'Pub crawls',
    description: 'Your saved crawls and invitations from friends, all in one place.',
    accent: 'bg-violet-600',
  },
  {
    to: '/venues',
    icon: 'i-heroicons-building-storefront-20-solid',
    title: 'Venues',
    description: 'Browse thousands of pubs and bars, filtered by town or county.',
    accent: 'bg-emerald-600',
  },
  {
    to: '/events',
    icon: 'i-heroicons-ticket-20-solid',
    title: 'Events',
    description: 'Live music, comedy, quizzes and sport on the big screen near you.',
    accent: 'bg-rose-600',
  },
  {
    to: '/counties',
    icon: 'i-heroicons-globe-europe-africa-20-solid',
    title: 'Browse by county',
    description: 'Explore pubs county by county across England, Scotland and Wales.',
    accent: 'bg-amber-500',
  },
  {
    to: '/news',
    icon: 'i-heroicons-newspaper-20-solid',
    title: 'Pub news',
    description: 'Openings, closures and industry stories from the UK pub trade.',
    accent: 'bg-sky-600',
  },
]
</script>
