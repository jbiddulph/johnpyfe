<template>
  <div v-if="articles.length" class="news-latest grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <article
      v-for="article in articles"
      :key="article.id"
      class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-amber-600"
    >
      <NuxtLink :to="`/news/${article.slug}`" class="block aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-800" :title="linkTitle(article)">
        <img
          :src="article.imageUrl || '/assets/images/awaiting.jpg'"
          :alt="imageAlt(article)"
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
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
</template>

<script setup lang="ts">
import { renderSeoTemplate } from '@/utils/site-seo-pages'

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

const newsSeo = useSiteSeoPageConfig('news-article')

function linkTitle(article: LatestNewsArticle) {
  const template = newsSeo.value.linkTitleTemplate
  return (template && renderSeoTemplate(template, { title: article.title, excerpt: article.excerpt })) || article.title
}

function imageAlt(article: LatestNewsArticle) {
  const template = newsSeo.value.imageAltTemplate
  return (template && renderSeoTemplate(template, { title: article.title, excerpt: article.excerpt })) || `${article.title} — UK pub news`
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>
