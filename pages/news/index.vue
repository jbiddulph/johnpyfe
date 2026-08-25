<template>
  <div class="container mx-auto px-4 py-10">
    <header class="max-w-3xl mb-10">
      <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        UK pub and bar news
      </h1>
      <p class="mt-3 text-lg text-gray-600 dark:text-gray-400">
        Latest openings, closures, festivals and industry stories from pubs and bars across England, Scotland and Wales.
      </p>
    </header>

    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="n in 6" :key="n" class="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 h-80 bg-gray-100 dark:bg-gray-800" />
    </div>

    <p v-else-if="error" class="text-red-600">Unable to load news right now. Please try again shortly.</p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <article
        v-for="article in articles"
        :key="article.id"
        class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        <NuxtLink :to="`/news/${article.slug}`" class="block aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            :src="article.imageUrl || '/assets/images/awaiting.jpg'"
            :alt="`${article.title} — UK pub and bar news`"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            width="640"
            height="400"
          >
        </NuxtLink>
        <div class="flex flex-1 flex-col p-4">
          <time class="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400" :datetime="article.publishedAt">
            {{ formatDate(article.publishedAt) }}
          </time>
          <h2 class="mt-2 text-xl font-semibold leading-snug text-gray-900 dark:text-white">
            <NuxtLink :to="`/news/${article.slug}`" class="hover:text-amber-700 dark:hover:text-amber-400">
              {{ article.title }}
            </NuxtLink>
          </h2>
          <p class="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-400">
            {{ article.excerpt }}
          </p>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
const requestFetch = useRequestFetch()
const siteUrl = siteBaseUrl()

const { data, pending, error } = await useAsyncData('news-index', () =>
  requestFetch('/api/news/latest?limit=50'),
)

const articles = computed(() => data.value?.articles ?? [])

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

useSiteSeo({
  title: 'UK Pub and Bar News — Openings, Closures and Industry Updates',
  description:
    'Read the latest UK pub and bar news: openings, closures, festivals, World Cup trading and hospitality stories from across England, Scotland and Wales.',
  keywords:
    'UK pub news, bar news UK, pub openings, pub closures, Wetherspoon news, CAMRA, British pubs, hospitality news',
  path: '/news',
  type: 'website',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'UK Pub and Bar News',
      description:
        'Latest openings, closures and industry stories from pubs and bars across the UK.',
      url: `${siteUrl}/news`,
      isPartOf: { '@type': 'WebSite', name: 'UK Pubs', url: siteUrl },
    },
    breadcrumbJsonLd(
      [
        { label: 'Home', to: '/' },
        { label: 'News', to: '/news' },
      ],
      siteUrl,
    ),
  ],
})
</script>
