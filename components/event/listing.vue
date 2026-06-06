<template>
  <div>
    <NuxtLink :to="`/events/${event.id}`" class="block">
    <div class="w-full items-center bg-white dark:bg-gray-900 rounded-md">
      <div class="p-4">
        <h2 class="font-bold text-2xl">{{ event.event_title }}</h2>
        <h3>{{ event.category.name }} at <NuxtLink :to="venuePath(event.listing.id, event.listing.slug)">{{ event.listing.venuename }}</NuxtLink></h3>
        <span><NuxtLink :to="`/town/${event.city.slug}`">{{ event.city.name }}</NuxtLink></span>
      </div>
      <div>
        <div class="calendar flex items-center flex-col w-full h-auto relative">
          <div class="bg-white rounded-lg absolute -top-2 right-4 z-10">
            <div class="flex flex-col">
              <div class="flex flex-row justify-between bg-red-700 text-white rounded-t-lg px-2 text-sm">
                <div class="month pr-2">{{ startParts.month }}</div>
                <div class="year">{{ startParts.year }}</div>
              </div>
              <div class="day text-3xl text-center text-black">{{ startParts.day }}</div>
              <div v-if="startParts.time" class="time text-center text-black">
                <small>at</small> {{ startParts.time }}
              </div>
              <div v-else class="time text-center text-black text-sm px-1 pb-1">All day</div>
            </div>
          </div>
          <img
            class="w-full h-[250px] object-cover bg-gray-200"
            :src="eventPhotoSrc"
            :alt="event.event_title"
          />
          <div
            v-if="countdownHtml"
            class="w-full px-4 py-2 absolute center bottom-0 bg-black bg-opacity-70 text-white font-bold text-lg shadow-lg z-10"
            v-html="countdownHtml"
          />
        </div>
      </div>
    </div>
  </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
import { useEventStore } from '@/store/event.js'
import { formatEventStart, resolveEventPhotoUrl } from '@/utils/format-event'

const eventStore = useEventStore()
const config = useRuntimeConfig()
const props = defineProps({
  event: Object,
  index: Number,
  venueId: Number,
})

const startParts = computed(() => formatEventStart(props.event?.event_start))
const eventPhotoSrc = computed(() =>
  resolveEventPhotoUrl(props.event?.photo, {
    eventImgFolder: config.public.eventImgFolder,
  }),
)

let countdownInterval: ReturnType<typeof setInterval> | undefined
const countdownHtml = ref('')

onMounted(async () => {
  try {
    if (props.venueId) {
      eventStore.events = await eventStore.fetchVenueEvents(props.venueId)
    }
    startCountdown()
  } catch (error) {
    console.error('Error loading event countdown:', error)
  }
})

function eventForCountdown() {
  if (props.venueId && Array.isArray(eventStore.events) && eventStore.events.length) {
    return props.event
  }
  return props.event
}

function calculateCountdown(eventStartDate: string, durationMinutes: number) {
  const now = new Date()
  const eventDate = new Date(eventStartDate)

  const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
  const eventDateLocal = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), eventDate.getHours(), eventDate.getMinutes(), eventDate.getSeconds())
  const eventEndDateLocal = new Date(eventDateLocal.getTime() + (durationMinutes || 0) * 60000)

  const timeDifference = eventDateLocal.getTime() - nowLocal.getTime()

  if (timeDifference > 0) {
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000)

    return `<div>
        <div class="flex flex-row justify-between" id="countdown">
        <div class="flex flex-col items-center"><span class="big">${days}</span> <small>day${days !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${hours}</span> <small>hour${hours !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${minutes}</span> <small>minute${minutes !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${seconds}</span> <small>second${seconds !== 1 ? 's' : ''}</small></div>
        </div>
      </div>`
  }
  if (nowLocal.getTime() <= eventEndDateLocal.getTime()) {
    return `
      <div class="flex items-center">
        <div class="pulsing-dot"></div>
        <span class="ml-2">Event is currently happening</span>
      </div>`
  }
  return `<UBadge color="red" variant="solid">Event has ended</UBadge>`
}

function startCountdown() {
  const event = eventForCountdown()
  if (!event?.event_start) return

  const tick = () => {
    countdownHtml.value = calculateCountdown(event.event_start, event.duration)
  }
  tick()
  countdownInterval = setInterval(tick, 1000)
}

onBeforeUnmount(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})
</script>

<style>
.router-link-exact-active {
  color: text-primary-700!important;
}
.big{
  font-size: 3rem;
  font-stretch: extra-condensed;
  font-weight: 100;
  color: rgba($color: #ddcf00, $alpha: 1.0);
  font-family: 'Doto', sans-serif;
}
.calendar {
  font-family: 'Kanit', sans-serif;
}
.pulsing-dot {
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
