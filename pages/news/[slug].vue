<template>
  <div v-if="pending" class="container mx-auto px-4 py-12">
    <div class="max-w-4xl mx-auto">
      <div class="animate-pulse">
        <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
        <div class="space-y-3">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="error" class="container mx-auto px-4 py-12">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">Article Not Found</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
        The article you're looking for doesn't exist or has been removed.
      </p>
      <UButton to="/" size="lg">Back to Home</UButton>
    </div>
  </div>

  <article v-else-if="article" class="container mx-auto px-4 py-12">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium mb-6"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </NuxtLink>

        <h1 class="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          {{ article.title }}
        </h1>

        <div class="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            {{ article.authorName }}
          </span>
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
            {{ formatDate(article.publishedAt) }}
          </span>
        </div>
      </div>

      <div 
        class="prose prose-lg prose-gray dark:prose-invert max-w-none
               prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
               prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
               prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline"
        v-html="article.content"
      />

      <div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const requestFetch = useRequestFetch()

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

const { data: article, pending, error } = await useAsyncData(
  `news-${route.params.slug}`,
  async () => {
    try {
      const response = await requestFetch(`/api/news/${route.params.slug}`)
      return response as NewsArticle
    } catch (err) {
      throw createError({ statusCode: 404, statusMessage: 'Article not found' })
    }
  },
)

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

if (article.value) {
  useSiteSeo({
    title: article.value.title,
    description: article.value.excerpt,
    path: `/news/${route.params.slug}`,
  })
}
</script>
