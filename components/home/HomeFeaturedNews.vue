<template>
  <section v-if="article" class="home-featured-news mb-12">
    <div class="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg overflow-hidden border border-amber-200 dark:border-gray-700">
      <NuxtLink
        v-if="article.imageUrl"
        :to="`/news/${article.slug}`"
        class="block aspect-[16/9] sm:aspect-[21/9] overflow-hidden bg-amber-100 dark:bg-gray-800"
      >
        <img
          :src="article.imageUrl"
          :alt="`${article.title} — UK pub news`"
          class="h-full w-full object-cover"
          width="1200"
          height="514"
        >
      </NuxtLink>
      <div class="px-6 py-8 sm:px-8 sm:py-10">
        <div class="flex items-center gap-2 mb-4">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 rounded-full">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            Featured Article
          </span>
        </div>
        
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          {{ article.title }}
        </h2>
        
        <p class="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          {{ article.excerpt }}
        </p>
        
        <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            {{ article.authorName }}
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
            {{ formatDate(article.publishedAt) }}
          </span>
        </div>
        
        <NuxtLink
          :to="`/news/${article.slug}`"
          class="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-lg transition-colors shadow-md hover:shadow-lg"
        >
          Read full article
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </section>
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

const props = defineProps<{
  article: NewsArticle | null
}>()

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}
</script>
