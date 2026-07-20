<template>
  <section class="home-ranked">
    <h2 class="text-3xl font-bold mb-2">{{ title }}</h2>
    <p v-if="description" class="text-lg text-gray-600 dark:text-gray-400 mb-4">{{ description }}</p>
    <ol
      v-if="items.length"
      class="grid list-none gap-3 p-0 m-0"
      :class="photoCards ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'"
    >
      <li v-for="(item, index) in items" :key="itemKey(item, index)">
        <NuxtLink
          v-if="photoCards"
          :to="item.href"
          class="home-ranked-photo block overflow-hidden rounded-lg shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <div
            class="home-ranked-photo__media relative min-h-[140px] overflow-hidden"
            :class="{ 'home-ranked-photo__media--fallback': !hasUsableImage(item, index) }"
          >
            <img
              v-if="hasUsableImage(item, index)"
              :src="imageSrc(item, index)"
              :alt="imageAlt(item)"
              class="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              @error="markImageFailed(item, index)"
            >
            <div class="home-ranked-photo__overlay" aria-hidden="true" />
            <div class="home-ranked-photo__content relative z-[1] flex min-h-[140px] flex-col justify-end p-4 text-white">
              <span class="home-ranked__rank home-ranked__rank--photo mb-2 w-fit" aria-hidden="true">
                {{ index + 1 }}
              </span>
              <span class="text-lg font-semibold leading-tight">{{ item.displayName }}</span>
              <span v-if="item.meta" class="mt-1 text-sm text-white/90 line-clamp-1">{{ item.meta }}</span>
              <span class="mt-1 text-sm text-white/90">
                {{ item.venueCount }}
                {{ item.venueCount === 1 ? props.countLabel.singular : props.countLabel.plural }}
              </span>
              <span v-if="imageAttribution(item, index)" class="mt-2 text-[10px] text-white/70 line-clamp-1">
                Photo: {{ imageAttribution(item, index) }}
              </span>
            </div>
          </div>
        </NuxtLink>
        <NuxtLink v-else :to="item.href" class="hub-card flex items-center justify-between gap-3">
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
  imageUrl?: string | null
  backupImageUrl?: string | null
  imageAttribution?: string | null
  backupImageAttribution?: string | null
  imageAlt?: string | null
}

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    items: HomeRankedItem[]
    countLabel?: { singular: string; plural: string }
    photoCards?: boolean
    fallbackImageUrl?: string
  }>(),
  {
    countLabel: () => ({ singular: 'pub', plural: 'pubs' }),
    photoCards: false,
    fallbackImageUrl: '/assets/images/awaiting.jpg',
  },
)

function itemKey(item: HomeRankedItem, index: number) {
  return item.slug || item.href || `${item.displayName}-${index}`
}

const failedImageKeys = ref(new Set<string>())

function imageKey(item: HomeRankedItem, index: number) {
  return item.imageUrl || itemKey(item, index)
}

function backupImageKey(item: HomeRankedItem, index: number) {
  return item.backupImageUrl || `${itemKey(item, index)}-backup`
}

function hasUsableImage(item: HomeRankedItem, index: number) {
  const src = imageSrc(item, index)
  return Boolean(src) && !failedImageKeys.value.has(src)
}

function imageSrc(item: HomeRankedItem, index: number) {
  if (item.imageUrl && !failedImageKeys.value.has(imageKey(item, index))) {
    return item.imageUrl
  }
  if (item.backupImageUrl && !failedImageKeys.value.has(backupImageKey(item, index))) {
    return item.backupImageUrl
  }
  return props.fallbackImageUrl
}

function markImageFailed(item: HomeRankedItem, index: number) {
  const nextFailedImageKeys = new Set(failedImageKeys.value)
  const failedSrc = imageSrc(item, index)
  if (failedSrc === item.imageUrl) {
    nextFailedImageKeys.add(imageKey(item, index))
  } else if (failedSrc === item.backupImageUrl) {
    nextFailedImageKeys.add(backupImageKey(item, index))
  } else {
    nextFailedImageKeys.add(failedSrc)
  }
  failedImageKeys.value = nextFailedImageKeys
}

function imageAlt(item: HomeRankedItem) {
  return item.imageAlt || (item.meta ? `${item.displayName} - ${item.meta}` : item.displayName)
}

function imageAttribution(item: HomeRankedItem, index: number) {
  const src = imageSrc(item, index)
  if (src === item.imageUrl) return item.imageAttribution || ''
  if (src === item.backupImageUrl) return item.backupImageAttribution || ''
  return ''
}
</script>

<style scoped>
.home-ranked__rank {
  @apply flex h-8 w-8 items-center justify-center rounded-full bg-lime-100 text-sm font-semibold text-lime-800 dark:bg-lime-900/40 dark:text-lime-200;
}

.home-ranked__rank--photo {
  @apply bg-white/20 text-white backdrop-blur-sm;
}

.home-ranked-photo__media--fallback {
  background-image: linear-gradient(135deg, #374151 0%, #111827 100%);
}

.home-ranked-photo__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
}
</style>
