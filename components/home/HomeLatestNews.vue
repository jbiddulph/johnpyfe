<template>
  <section v-if="articles.length" class="home-latest-news mb-12" aria-labelledby="latest-news-heading">
    <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h2 id="latest-news-heading" class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Latest pub news
        </h2>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          Openings, closures and industry stories from pubs and bars across the UK.
        </p>
      </div>
      <UButton to="/news" color="amber" variant="soft" trailing-icon="i-heroicons-arrow-right">
        All news
      </UButton>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <article
        v-for="article in articles"
        :key="article.id"
        class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
      >
        <NuxtLink :to="`/news/${article.slug}`" class="block aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            :src="article.imageUrl || '/assets/images/awaiting.jpg'"
            :alt="`${article.title} — UK pub news`"
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
          <h3 class="mt-2 text-lg font-semibold leading-snug text-gray-900 dark:text-white">
            <NuxtLink :to="`/news/${article.slug}`" class="hover:text-amber-700 dark:hover:text-amber-400">
              {{ article.title }}
            </NuxtLink>
          </h3>
          <p class="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {{ article.excerpt }}
          </p>
          <NuxtLink
            :to="`/news/${article.slug}`"
            class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-400"
          >
            Read more
            <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
interface LatestNewsArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  imageUrl: string | null
  authorName: string
  publishedAt: string
  isFeatured?: boolean
}

defineProps<{
  articles: LatestNewsArticle[]
}>()

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>
