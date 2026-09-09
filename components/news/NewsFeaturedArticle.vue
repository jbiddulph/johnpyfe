<template>
  <article
    v-if="article"
    class="news-featured overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg dark:border-gray-700 dark:from-gray-800 dark:to-gray-900"
  >
    <div class="grid grid-cols-1 lg:grid-cols-2">
      <NuxtLink
        v-if="article.imageUrl"
        :to="`/news/${article.slug}`"
        class="block aspect-[16/9] overflow-hidden bg-amber-100 dark:bg-gray-800 lg:aspect-auto lg:min-h-[320px]"
      >
        <img
          :src="article.imageUrl"
          :alt="`${article.title} — UK pub news`"
          class="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          width="960"
          height="540"
          loading="lazy"
          decoding="async"
        >
      </NuxtLink>
      <div class="flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10">
        <div class="mb-4 flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            Featured article
          </span>
        </div>

        <h3 class="mb-4 text-2xl font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl">
          <NuxtLink :to="`/news/${article.slug}`" class="hover:text-amber-800 dark:hover:text-amber-300">
            {{ article.title }}
          </NuxtLink>
        </h3>

        <p class="mb-6 text-base leading-relaxed text-gray-700 dark:text-gray-300 sm:text-lg">
          {{ article.excerpt }}
        </p>

        <div class="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span class="flex items-center gap-1.5">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            {{ article.authorName }}
          </span>
          <time class="flex items-center gap-1.5" :datetime="article.publishedAt">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
            {{ formatDate(article.publishedAt) }}
          </time>
        </div>

        <NuxtLink
          :to="`/news/${article.slug}`"
          class="inline-flex w-fit items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-amber-700 hover:shadow-lg dark:bg-amber-500 dark:hover:bg-amber-600"
        >
          Read full article
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
interface NewsArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  imageUrl: string | null
  authorName: string
  publishedAt: string
}

defineProps<{
  article: NewsArticle | null
}>()

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>
