<template>
  <HomeHeroSearch />
  <HomeWorldCupBanner />

  <div class="container mx-auto px-4 py-10">
    <section class="mb-12 text-center max-w-3xl mx-auto">
      <p class="text-xl text-gray-600 dark:text-gray-400">
        Discover events, browse by town or county, and find pubs near you — including
        <strong class="font-medium text-gray-700 dark:text-gray-300">World Cup 2026 sports pubs</strong>,
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
    imageAlt: `${s.stadiumName}, home of ${s.club}`,
  })),
)

const siteUrl = siteBaseUrl()

useSiteSeo({
  title: 'World Cup 2026 Pubs & Sports Bars UK — Watch England Live',
  description:
    'Find pubs and sports bars showing FIFA World Cup 2026 across the UK. Watch Norway vs England live on Saturday 11 July at 10pm BST — discover World Cup pubs in London, Manchester, Birmingham, Leeds, Liverpool, Bristol, Brighton, Glasgow, Edinburgh, Newcastle, Sheffield, Nottingham and Cardiff. Browse sports bars with big screens, England quarter-final screenings, BBC One and ITV pub viewings, and bookable sports pubs near you.',
  keywords:
    'World Cup 2026 pubs, World Cup pubs UK, sports bars UK, pubs showing World Cup, England World Cup pubs, watch England World Cup pub, Norway vs England pub, World Cup sports bars, World Cup quarter-final pubs, FIFA World Cup venues UK, pubs showing football UK, sports pub finder, World Cup 2026 London pubs, World Cup pubs Manchester, World Cup pubs Birmingham, World Cup pubs Leeds, World Cup pubs Liverpool, World Cup pubs Bristol, World Cup pubs Brighton, World Cup pubs Newcastle, World Cup pubs Sheffield, World Cup pubs Nottingham, World Cup pubs Cardiff, World Cup pubs Glasgow, World Cup pubs Edinburgh, pubs with big screens, sports bars near me, England knockout pubs, Quarter-final World Cup pub, BBC One World Cup pub, watch World Cup in pub, UK sports venues, football pubs UK, World Cup screening pubs, book sports pub table, FANZO pubs, O\'Neills World Cup, Walkabout World Cup, BOX sports bar, sports TV pubs, England Norway pub screening, Hard Rock Stadium Miami',
  path: '/',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: 'Norway vs England — FIFA World Cup 2026 Quarter-final',
      description:
        'Watch Norway vs England in the FIFA World Cup 2026 Quarter-final at UK pubs and sports bars. Kick-off Saturday 11 July 2026 at 10:00pm BST, live on BBC One from Hard Rock Stadium, Miami.',
      startDate: '2026-07-11T22:00:00+01:00',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: 'Hard Rock Stadium',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Miami',
          addressRegion: 'FL',
          addressCountry: 'US',
        },
      },
      organizer: {
        '@type': 'Organization',
        name: 'FIFA',
      },
      offers: {
        '@type': 'Offer',
        url: `${siteUrl}/search?q=sports+bar`,
        availability: 'https://schema.org/InStock',
        price: '0',
        priceCurrency: 'GBP',
        description: 'Find UK pubs and sports bars screening the match',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'World Cup 2026 Pubs & Sports Bars UK',
      description:
        'UK Pubs directory of sports bars, football pubs and venues showing FIFA World Cup 2026 matches including England fixtures.',
      url: siteUrl,
      about: {
        '@type': 'Thing',
        name: 'FIFA World Cup 2026 pub and sports bar listings',
      },
    },
  ],
})
</script>
