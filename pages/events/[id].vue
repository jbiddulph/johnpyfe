<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold my-8">
      <NuxtLink to="/events">
        <span class="text-amber-500">Events</span>
      </NuxtLink>
      - {{ event.event_title }}
    </h1>
    <div class="flex flex-col md:flex-row">
      <img
        :src="`${config.public.eventImgFolder}/${event.photo}`"
        :alt="event.event_title"
        class="w-full md:w-1/2 h-auto object-cover"
      />
      <div class="md:ml-8">
        <p><strong>Description:</strong> {{ event?.description }}</p>
        <p><strong>Cost:</strong> {{ event?.cost }}</p>
        <p><strong>Duration:</strong> {{ event?.duration }} minutes</p>
        <p><strong>Start Time:</strong> {{ event?.event_start }}</p>
        <p><strong>Category:</strong> {{ event?.category?.name }}</p>
        <p><strong>City:</strong> {{ event?.city?.name }}</p>
        <p>
          <strong>Venue:</strong>
          <NuxtLink
            v-if="event?.listing"
            :to="venuePath(event.listing.id, event.listing.slug)"
          >
            {{ event?.listing?.venuename }}
          </NuxtLink>
        </p>
        <p v-if="event?.website">
          <strong>Website:</strong>
          <a :href="event.website" target="_blank" rel="noopener">{{ event.website }}</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const config = useRuntimeConfig()
const eventId = route.params.id

const { data: event, error } = await useAsyncData(`event-${eventId}`, () =>
  $fetch(`/api/events/${eventId}`),
)

if (error.value || !event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found' })
}

const canonicalPath = `/events/${event.value.id}`
const venueName = event.value.listing?.venuename
const town = event.value.listing?.town || event.value.city?.name
const seoTitle = `${event.value.event_title}${venueName ? ` at ${venueName}` : ''}`
const seoDescription =
  event.value.description?.slice(0, 160) ||
  `${event.value.event_title}${town ? ` in ${town}` : ''} — find pubs, gigs and events on UK Pubs.`

useSiteSeo({
  title: seoTitle,
  description: seoDescription,
  path: canonicalPath,
  type: 'article',
  jsonLd: eventJsonLd(event.value, `${siteBaseUrl()}${canonicalPath}`),
})
</script>
