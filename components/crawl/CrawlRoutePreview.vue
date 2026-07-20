<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60">
    <ClientOnly>
      <div v-if="!hasToken" class="flex h-40 items-center justify-center px-4 text-center text-xs text-gray-500 sm:h-48">
        Map preview unavailable (Mapbox token not configured).
      </div>
      <div v-else-if="!mapUrl" class="flex h-40 items-center justify-center px-4 text-center text-xs text-gray-500 sm:h-48">
        {{ emptyLabel }}
      </div>
      <NuxtLink
        v-else
        to="/map"
        class="group relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-label="`View ${crawlName} route on the map`"
      >
        <img
          :src="mapUrl"
          :alt="`${crawlName} route map`"
          class="h-40 w-full object-cover sm:h-52"
          width="640"
          height="280"
          loading="lazy"
          decoding="async"
        />
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2 pt-8"
        >
          <p class="truncate text-xs font-medium text-white">
            {{ stopSummary }}
          </p>
        </div>
      </NuxtLink>
      <template #fallback>
        <div class="h-40 animate-pulse bg-gray-200 dark:bg-gray-800 sm:h-52" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { crawlStaticMapUrl, crawlStopCoordinates, type CrawlMapStop } from '@/utils/crawl-static-map'

const props = defineProps<{
  crawlName: string
  stops?: CrawlMapStop[] | null
  stopCount?: number
}>()

const mapboxToken = useMapboxToken()

const hasToken = computed(() => Boolean(mapboxToken.value))

const mapUrl = computed(() =>
  crawlStaticMapUrl(props.stops, mapboxToken.value, 640, 280),
)

const coordCount = computed(() => crawlStopCoordinates(props.stops).length)

const emptyLabel = computed(() => {
  if ((props.stopCount || 0) > 0 && coordCount.value === 0) {
    return 'Stops are missing map coordinates.'
  }
  return 'Add pubs on the map to see this route.'
})

const stopSummary = computed(() => {
  const names = (props.stops || [])
    .map((stop) => String(stop.venueName || '').trim())
    .filter(Boolean)
  if (!names.length) {
    const n = props.stopCount || coordCount.value
    return n ? `${n} stop${n === 1 ? '' : 's'}` : 'Route'
  }
  if (names.length <= 3) return names.join(' → ')
  return `${names[0]} → … → ${names[names.length - 1]} (${names.length} stops)`
})
</script>
