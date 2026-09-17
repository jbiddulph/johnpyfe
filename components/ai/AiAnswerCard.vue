<template>
  <div class="ai-answer space-y-6">
    <article
      class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-6"
    >
      <p class="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
        <UIcon name="i-heroicons-sparkles-20-solid" class="h-4 w-4" />
        {{ fallback ? 'Listing match' : 'UK Pubs assistant' }}
      </p>
      <p class="whitespace-pre-wrap text-base leading-relaxed text-gray-800 dark:text-gray-100">{{ answer }}</p>
    </article>

    <section v-if="links.length" aria-labelledby="ai-related-heading">
      <h2 id="ai-related-heading" class="mb-3 text-xl font-bold text-gray-900 dark:text-white">Related listings</h2>
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 list-none p-0 m-0">
        <li v-for="link in links" :key="link.href">
          <NuxtLink :to="link.href" class="hub-card flex items-start justify-between gap-3">
            <span>
              <span class="hub-card__title">{{ link.title }}</span>
              <span v-if="link.meta" class="mt-1 block text-sm text-gray-600 dark:text-gray-400">{{ link.meta }}</span>
            </span>
            <span class="hub-card__meta shrink-0 capitalize">{{ kindLabel(link.kind) }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { AiPromptLink, AiPromptLinkKind } from '@/types/ai-prompt'

defineProps<{
  answer: string
  links: AiPromptLink[]
  fallback?: boolean
}>()

function kindLabel(kind: AiPromptLinkKind) {
  if (kind === 'page') return 'page'
  return kind
}
</script>
