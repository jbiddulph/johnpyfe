<template>
  <div class="header-img w-full overflow-hidden bg-gray-200">
    <img
      src="/assets/images/filip-andrejevic-QmX5lw8StoQ-unsplash.jpg"
      alt="Pub interior"
      width="1920"
      height="480"
      fetchpriority="high"
      loading="eager"
      decoding="async"
      class="w-full h-auto max-h-[480px] object-cover"
    />
  </div>

  <div class="container mx-auto px-4 py-10">
    <section class="mb-12 text-center max-w-3xl mx-auto">
      <h1 class="text-4xl md:text-5xl font-bold mb-4">Pubs and venues across the UK</h1>
      <p class="text-xl text-gray-600 dark:text-gray-400">
        Discover events, browse by town or county, and find pubs near you — including coastal towns and Premier League grounds.
      </p>
      <div class="flex flex-wrap justify-center gap-3 mt-6">
        <UButton to="/venues" size="lg" color="amber">Browse venues</UButton>
        <UButton to="/counties" size="lg" variant="outline">Browse by county</UButton>
        <UButton to="/events" size="lg" variant="outline">Events</UButton>
      </div>
    </section>

    <div v-if="statsPending" class="text-lg text-gray-600 text-center py-8">Loading highlights…</div>

    <template v-else-if="stats">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        <HomeRankedList
          title="Top 10 towns with the most pubs"
          description="UK towns ranked by the number of live pub and venue listings."
          :items="stats.topTowns"
        />
        <HomeRankedList
          title="Top 10 counties with the most pubs"
          description="Counties ranked by venue listings across England, Scotland, and Wales."
          :items="stats.topCounties"
          photo-cards
        />
      </div>

      <HomeRankedList
        class="mb-12"
        title="Top 20 seaside towns for pubs"
        description="Coastal towns ranked by pub listings — matched by town name and venue locations near the coast."
        :items="stats.topSeasideTowns"
      />

      <section id="premier-league-pubs" class="mb-12">
        <HomeRankedList
          title="Pubs within 1 mile of every Premier League stadium"
          :description="`Live venue listings within ${stats.stadiumRadiusMiles} mile of each stadium (straight-line distance).`"
          :items="stadiumListItems"
          photo-cards
        />
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        <HomeRankedList
          title="Top 10 venues with events"
          description="Venues with the most upcoming gigs, live music, comedy and other listings."
          :items="stats.topVenuesWithEvents"
          :count-label="{ singular: 'event', plural: 'events' }"
        />
        <HomeRankedList
          title="Top 10 towns with events"
          description="Towns ranked by the number of upcoming events at local pubs and venues."
          :items="stats.topTownsWithEvents"
          :count-label="{ singular: 'event', plural: 'events' }"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
const requestFetch = useRequestFetch()

const { data: stats, pending: statsPending } = await useAsyncData(
  'homepage-stats',
  () => requestFetch('/api/homepage/stats'),
)

const stadiumListItems = computed(() =>
  (stats.value?.stadiumPubs ?? []).map((s) => ({
    displayName: s.club,
    meta: s.stadiumName,
    venueCount: s.pubCount,
    href: s.href,
    slug: s.slug,
    imageUrl: s.imageUrl,
    imageAttribution: s.imageAttribution,
  })),
)

useSiteSeo({
  title: 'Events in pubs and venues around the UK',
  description:
    'Discover gigs, live music, comedy, quizzes and events at pubs and venues across the UK. Top towns, counties, seaside destinations, and pubs near Premier League stadiums.',
  path: '/',
})
</script>
