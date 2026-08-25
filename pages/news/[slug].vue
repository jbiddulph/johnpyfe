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
      <UButton to="/news" size="lg">Browse latest news</UButton>
    </div>
  </div>

  <article v-else-if="article" class="container mx-auto px-4 py-12" itemscope itemtype="https://schema.org/NewsArticle">
    <div class="max-w-4xl mx-auto">
      <nav class="mb-6 text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
        <ol class="flex flex-wrap items-center gap-2">
          <li><NuxtLink to="/" class="hover:text-amber-700 dark:hover:text-amber-400">Home</NuxtLink></li>
          <li aria-hidden="true">/</li>
          <li><NuxtLink to="/news" class="hover:text-amber-700 dark:hover:text-amber-400">News</NuxtLink></li>
          <li aria-hidden="true">/</li>
          <li class="text-gray-700 dark:text-gray-300 line-clamp-1">{{ article.title }}</li>
        </ol>
      </nav>

      <header class="mb-8">
        <h1 class="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight" itemprop="headline">
          {{ article.title }}
        </h1>

        <div class="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
          <span class="flex items-center gap-2" itemprop="author" itemscope itemtype="https://schema.org/Person">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            <span itemprop="name">{{ article.authorName }}</span>
          </span>
          <time
            class="flex items-center gap-2"
            :datetime="article.publishedAt"
            itemprop="datePublished"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
            {{ formatDate(article.publishedAt) }}
          </time>
        </div>

        <figure v-if="article.imageUrl" class="mb-8 -mx-4 sm:mx-0 overflow-hidden sm:rounded-xl">
          <img
            :src="article.imageUrl"
            :alt="imageAlt"
            class="w-full max-h-[28rem] object-cover"
            itemprop="image"
            width="1200"
            height="675"
          >
        </figure>
      </header>

      <div
        class="prose prose-lg prose-gray dark:prose-invert max-w-none
               prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
               prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
               prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline"
        itemprop="articleBody"
        v-html="article.content"
      />

      <div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
        <NuxtLink
          to="/news"
          class="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          More UK pub news
        </NuxtLink>
        <NuxtLink
          to="/venues"
          class="inline-flex items-center gap-2 text-gray-600 hover:text-amber-700 dark:text-gray-400 dark:hover:text-amber-300 font-medium"
        >
          Browse pubs near you
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const requestFetch = useRequestFetch()
const siteUrl = siteBaseUrl()

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
    } catch {
      throw createError({ statusCode: 404, statusMessage: 'Article not found' })
    }
  },
)

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function absoluteImage(url: string | null | undefined) {
  if (!url) return `${siteUrl}/ukpubs-logo.png`
  if (url.startsWith('http')) return url
  return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`
}

function keywordsFromTitle(title: string) {
  const base = [
    'UK pub news',
    'British pubs',
    'pub openings',
    'bar news UK',
    'hospitality UK',
    'UK Pubs',
  ]
  const fromTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8)
  return [...new Set([...fromTitle, ...base])].join(', ')
}

const imageAlt = computed(() =>
  article.value ? `${article.value.title} — UK pub and bar news` : 'UK pub news',
)

useSiteSeo(() => {
  const a = article.value
  if (!a) {
    return {
      title: 'Pub news article',
      description: 'UK pub and bar news on UK Pubs.',
      path: `/news/${String(route.params.slug)}`,
    }
  }

  const path = `/news/${a.slug}`
  const image = absoluteImage(a.imageUrl)

  return {
    title: a.title,
    description: a.excerpt,
    keywords: keywordsFromTitle(a.title),
    path,
    image: a.imageUrl || '/ukpubs-logo.png',
    type: 'article' as const,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: a.title,
        description: a.excerpt,
        image: [image],
        datePublished: a.publishedAt,
        dateModified: a.publishedAt,
        author: {
          '@type': 'Person',
          name: a.authorName,
        },
        publisher: {
          '@type': 'Organization',
          name: 'UK Pubs',
          logo: {
            '@type': 'ImageObject',
            url: `${siteUrl}/ukpubs-logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${siteUrl}${path}`,
        },
        articleSection: 'Pub News',
        inLanguage: 'en-GB',
      },
      breadcrumbJsonLd(
        [
          { label: 'Home', to: '/' },
          { label: 'News', to: '/news' },
          { label: a.title, to: path },
        ],
        siteUrl,
      ),
    ],
  }
})
</script>
