<template>
  <section class="home-ranked">
    <h2 class="text-3xl font-bold mb-2">{{ title }}</h2>
    <p v-if="description" class="text-lg text-gray-600 dark:text-gray-400 mb-4">{{ description }}</p>
    <ol v-if="items.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0">
      <li v-for="(item, index) in items" :key="itemKey(item, index)">
        <NuxtLink :to="item.href" class="hub-card flex items-center justify-between gap-3">
          <span class="flex items-center gap-3 min-w-0">
            <span class="home-ranked__rank shrink-0" aria-hidden="true">{{ index + 1 }}</span>
            <span class="min-w-0">
              <span class="hub-card__title block truncate">{{ item.displayName }}</span>
              <span v-if="item.meta" class="hub-card__meta block truncate">{{ item.meta }}</span>
            </span>
          </span>
          <span class="hub-card__meta shrink-0 text-right">
            {{ item.venueCount }} {{ item.venueCount === 1 ? props.countLabel.singular : props.countLabel.plural }}
          </span>
        </NuxtLink>
      </li>
    </ol>
    <p v-else class="text-lg text-gray-600">No data available yet.</p>
  </section>
</template>

<script setup lang="ts">
export type HomeRankedItem = {
  displayName: string
  venueCount: number
  href: string
  meta?: string
  slug?: string
}

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    items: HomeRankedItem[]
    countLabel?: { singular: string; plural: string }
  }>(),
  {
    countLabel: () => ({ singular: 'pub', plural: 'pubs' }),
  },
)

function itemKey(item: HomeRankedItem, index: number) {
  return item.slug || item.href || `${item.displayName}-${index}`
}
</script>

<style scoped>
.home-ranked__rank {
  @apply flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200;
}
</style>
