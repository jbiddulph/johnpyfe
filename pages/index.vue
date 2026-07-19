<template>
  <HomeHeroSearch />
  <HomePubCrawlAnnouncementModal />

  <div class="container mx-auto px-4 py-10">
    <section class="mb-12 text-center max-w-3xl mx-auto">
      <p class="text-xl text-gray-600 dark:text-gray-400">
        Discover events, browse by town or county, and find pubs near you — including
        <strong class="font-medium text-gray-700 dark:text-gray-300">sports pubs</strong>,
        coastal towns and Premier League grounds.
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
          fallback-image-url="/assets/images/headers/brighton-and-hove.jpg"
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
          fallback-image-url="/assets/images/filip-andrejevic-QmX5lw8StoQ-unsplash.jpg"
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
    imageAlt: `${s.stadiumName}, home of ${s.club}`,
  })),
)

const siteUrl = siteBaseUrl()

useSiteSeo({
  title: 'UK Pubs & Sports Bars Directory — Find Venues Near You',
  description:
    'Discover pubs and sports bars across the UK. Browse venues in London, Manchester, Birmingham, Leeds, Liverpool, Bristol, Brighton, Glasgow, Edinburgh, Newcastle, Sheffield, Nottingham and Cardiff. Find sports bars with big screens, live events, coastal pubs, and venues near Premier League grounds.',
  keywords:
    'UK pubs, sports bars UK, pubs near me, UK pub directory, sports pubs, football pubs UK, live sports venues, pubs with big screens, sports bars near me, UK venues, pub finder, London pubs, Manchester pubs, Birmingham pubs, Leeds pubs, Liverpool pubs, Bristol pubs, Brighton pubs, Newcastle pubs, Sheffield pubs, Nottingham pubs, Cardiff pubs, Glasgow pubs, Edinburgh pubs, coastal pubs, Premier League pubs, live music venues, pub events, sports TV pubs',
  path: '/',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'UK Pubs & Sports Bars Directory',
      description:
        'Comprehensive UK directory of pubs, sports bars, and venues with live events, sports screenings, and more.',
      url: siteUrl,
      about: {
        '@type': 'Thing',
        name: 'UK pub and sports bar listings',
      },
    },
  ],
})
</script>
