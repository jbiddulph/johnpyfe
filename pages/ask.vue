<template>
  <div class="container mx-auto px-4 py-8">
    <Breadcrumbs :items="breadcrumbItems" />

    <header class="mb-8 max-w-3xl">
      <p class="text-sm font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">Ask UK Pubs</p>
      <h1 class="mt-1 text-4xl font-bold text-gray-900 dark:text-white">Ask anything</h1>
      <p class="mt-3 text-lg text-gray-600 dark:text-gray-400">
        Ask in plain English about pubs, towns, events, news or stadiums. The assistant looks up our listings through private database functions — it does not invent pubs or opening hours.
      </p>
    </header>

    <div class="max-w-3xl">
      <AiPromptBox
        :key="initialPrompt || 'ask'"
        :initial-prompt="initialPrompt"
        :auto-submit="Boolean(initialPrompt)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const initialPrompt = computed(() => String(route.query.q || '').trim())

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Ask AI' },
]

useSiteSeo(() => ({
  title: 'Ask UK Pubs AI',
  description:
    'Ask anything about UK pubs, bars, events, towns and stadiums. The assistant looks up live listings from the UK Pubs directory.',
  keywords: 'UK pubs AI, ask pubs, pub search, events, dog friendly pubs',
  path: '/ask',
}))
</script>
