<template>
  <HomeHeroSearch />
  <HomePubCrawlAnnouncementModal />

  <div class="home-band bg-white dark:bg-gray-900">
    <div class="container mx-auto px-4 py-14">
      <HomeExploreTiles :intro="homeIntro || undefined" />
    </div>
  </div>

  <HomePubCrawlDemo />

  <div v-if="featuredNews || latestNews.length" class="home-band">
    <div class="container mx-auto px-4 py-14">
      <section aria-labelledby="latest-news-heading">
        <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">News</p>
            <h2 id="latest-news-heading" class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              Latest pub news
            </h2>
            <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Openings, closures and industry stories from pubs and bars across the UK.
            </p>
          </div>
          <UButton to="/news" color="amber" variant="soft" trailing-icon="i-heroicons-arrow-right">
            All news
          </UButton>
        </div>

        <NewsFeaturedArticle :article="featuredNews" class="mb-8" />
        <NewsLatestArticles :articles="latestNews" />
      </section>
    </div>
  </div>

  <div class="home-band bg-white dark:bg-gray-900">
    <div class="container mx-auto px-4 py-14">
      <div class="mb-10 max-w-3xl">
        <p class="text-sm font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">Explore the UK</p>
        <h2 class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Pubs by the numbers</h2>
        <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">
          The towns, counties, seaside spots and stadium neighbourhoods with the most pubs and events.
        </p>
      </div>

      <div v-if="statsPending" class="py-8 text-center text-lg text-gray-600">Loading highlights…</div>

      <template v-else-if="stats">
        <div class="mb-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
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
            fallback-image-url="/assets/images/headers/brighton-and-hove-640.webp"
          />
        </div>

        <HomeRankedList
          class="mb-12"
          title="Top 20 seaside towns for pubs"
          description="Coastal towns ranked by pub listings, matched by town name."
          :items="stats.topSeasideTowns"
        />

        <section id="premier-league-pubs" class="mb-12">
          <HomeRankedList
            title="Pubs within 1 mile of every Premier League stadium"
            :description="`Live venue listings within ${stats.stadiumRadiusMiles} mile of each stadium (straight-line distance).`"
            :items="stadiumListItems"
            photo-cards
            fallback-image-url="/assets/images/hero-home-1280.webp"
          />
        </section>

        <div class="grid grid-cols-1 gap-10 lg:grid-cols-2">
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
  </div>
</template>

<script lang="ts" setup>
const HOMEPAGE_NEWS_LIMIT = 6

const homeIntro = useSiteSeoIntro('home')

const requestFetch = useRequestFetch()

const [{ data: stats, pending: statsPending }, { data: featuredNews }, { data: latestNewsData }] = await Promise.all([
  useAsyncData('homepage-stats', () => requestFetch('/api/homepage/stats')),
  useAsyncData('featured-news', () => requestFetch('/api/news/featured')),
  useAsyncData('latest-news', () => requestFetch(`/api/news/latest?limit=${HOMEPAGE_NEWS_LIMIT + 1}`)),
])

const latestNews = computed(() => {
  const articles = latestNewsData.value?.articles ?? []
  const featuredId = featuredNews.value?.id
  return articles
    .filter((article) => article.id !== featuredId)
    .slice(0, HOMEPAGE_NEWS_LIMIT)
})

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
    'UK pubs, sports bars UK, pubs near me, UK pub directory, sports pubs, football pubs UK, live sports venues, pubs with big screens, sports bars near me, UK venues, pub finder, London pubs, Manchester pubs, Birmingham pubs, Leeds pubs, Liverpool pubs, Bristol pubs, Brighton pubs, Newcastle pubs, Sheffield pubs, Nottingham pubs, Cardiff pubs, Glasgow pubs, Edinburgh pubs, coastal pubs, Premier League pubs, live music venues, pub events, sports TV pubs, pub crawl planner',
  path: '/',
  page: { key: 'home' },
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
