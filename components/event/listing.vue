<template>
  <div>
    <NuxtLink :to="`/events/${event.id}`" class="block">
    <div class="w-full items-center bg-white dark:bg-gray-900 rounded-md">
      <div class="p-4">
        <h2 class="font-bold text-2xl">{{ event.event_title }}</h2>
        <h3>{{ event.category.name }} at <NuxtLink :to="`/venues/${event.listing.id}/${event.listing.slug}`">{{ event.listing.venuename }}</NuxtLink></h3>
        <span><NuxtLink :to="`/town/${event.city.slug}`">{{ event.city.name }}</NuxtLink></span>
      </div>
      <div>
        <div class="calendar flex items-center flex-col w-full h-auto relative">
          <div class="bg-white rounded-lg absolute -top-2 right-4">
            <div class="flex flex-col">
              <div class="flex flex-row justify-between bg-red-700 text-white rounded-t-lg px-2 text-sm">
                <div class="month pr-2">{{ formatDate(event.event_start).month }}</div>
                <div class="year">{{ formatDate(event.event_start).year }}</div>
              </div>
              <div class="day text-3xl text-center text-black">{{ formatDate(event.event_start).day }}</div>
              <div class="time text-center text-black"><small>at</small> {{ formatDate(event.event_start).time }}</div>
            </div>
          </div>
          <img 
            class="w-full h-[250px] object-cover" 
            :src="`${useRuntimeConfig().public.eventImgFolder}${event.photo}`" 
            alt="Event image" 
          />
          <div class="w-full px-4 pb-1 absolute center bottom-0 bg-black bg-opacity-70 text-white font-bold text-lg shadow-lg z-10" v-html="countdowns[index]"></div>
        </div>
      </div>
    </div>
  </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
import { useEventStore } from "@/store/event.js";
const eventStore = useEventStore();
const props = defineProps({
  event: Object,
  formatDate: Function,
  countdowns: Array,
  index: Number
});
let countdownInterval: number | undefined = undefined;
onMounted( async() => {
  // await eventStore.fetchAllEvents();
  try {
    eventStore.fetchAllEvents();
    if(props.venueId){
      eventStore.events = await eventStore.fetchVenueEvents(props.venueId);
    }
    startCountdowns();
  } catch (error) {
    console.error("Error fetching events:", error);
  }
});
function calculateCountdown(eventStartDate: string, durationMinutes: number) {
  const now = new Date(); // Local time
  const eventDate = new Date(eventStartDate); // Parse the event date
  
  // Ensure both dates are treated consistently in local timezone
  const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
  const eventDateLocal = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), eventDate.getHours(), eventDate.getMinutes(), eventDate.getSeconds());
  const eventEndDateLocal = new Date(eventDateLocal.getTime() + (durationMinutes || 0) * 60000); // Duration in milliseconds

  const timeDifference = eventDateLocal.getTime() - nowLocal.getTime(); // Difference in milliseconds

  if (timeDifference > 0) {
    // Event hasn't started yet
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

    return `<div>
        <div class="flex flex-row justify-between" id="countdown">
        <div class="flex flex-col items-center"><span class="big">${days}</span> <small>day${days !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${hours}</span> <small>hour${hours !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${minutes}</span> <small>minute${minutes !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${seconds}</span> <small>second${seconds !== 1 ? 's' : ''}</small></div>
        </div>
      </div>`;
  } else if (nowLocal.getTime() <= eventEndDateLocal.getTime()) {
    // Event is currently happening
    return `
      <div class="flex items-center">
        <div class="pulsing-dot"></div>
        <span class="ml-2">Event is currently happening</span>
      </div>`;
  } else {
    // Event has ended
    return `<UBadge color="red" variant="solid">Event has ended</UBadge>`;
  }
}
function formatDate(dateString: string) {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getUTCFullYear().toString().slice(-2); // Get last two digits of the year
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');

  // Format the day with "st", "nd", "rd", or "th"
  const daySuffix = (day) => {
    if (day > 3 && day < 21) return 'th'; // 11th, 12th, 13th
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return {
    day: `${day}${daySuffix(day)}`,
    month,
    year,
    time: `${hours}:${minutes}`,
  };
}
function startCountdowns() {
  if (Array.isArray(eventStore.events)) {
    countdowns.value = eventStore.events.map(event => calculateCountdown(event.event_start, event.duration));
  } else {
    console.error("Events is not an array:", eventStore.events);
    countdowns.value = [];
  }

  countdownInterval = setInterval(() => {
    if (Array.isArray(eventStore.events)) {
      countdowns.value = eventStore.events.map(event => calculateCountdown(event.event_start, event.duration));
    }
  }, 1000);
}
const countdowns = ref([]); 
onBeforeUnmount(() => {
  clearInterval(countdownInterval);
});
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