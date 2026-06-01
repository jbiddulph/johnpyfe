<template>
  <div>
    <div class="relative">
      <img
        :src="`/assets/images/headers/${route.params.town}.jpg`"
        :alt="`Events in ${townName}`"
        :title="townName"
        class="w-full h-auto object-cover"
      />
      <h1 class="text-6xl md:text-8xl absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
        {{ townName }}
      </h1>
    </div>
    <div class="container mx-auto p-4 my-8">
      <h2 class="text-4xl font-bold my-8">Events in {{ townName }}</h2>
      <ul v-if="townEvents.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(event, index) in townEvents" :key="event.id">
          <event-listing :event="event" :index="index" />
        </li>
      </ul>
      <p v-else class="text-lg text-gray-600">No upcoming events in this town.</p>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const townSlug = route.params.town

const { data: townData, error } = await useAsyncData(`town-${townSlug}`, () =>
  $fetch(`/api/events/town/${townSlug}`),
)

if (error.value || !townData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Town not found' })
}

const townName = computed(() => townData.value?.cityName ?? townSlug)
const townEvents = computed(() => townData.value?.events ?? [])
const canonicalPath = townPath(String(townSlug))

useSiteSeo({
  title: `Events in ${townName.value} — pubs & venues`,
  description: `Upcoming gigs, live music, comedy and pub events in ${townName.value}. Browse venues and what's on near you.`,
  path: canonicalPath,
})

onMounted(() => {
  const eventStore = useEventStore()
  eventStore.selectedTown = townName.value
  eventStore.townEvents = townEvents.value
})
</script>
