<template>
  <div>
    <div class="mb-6">
      <button @click="$emit('close')" class="absolute top-2 right-2 p-2 h-10 w-10 rounded-full bg-gray-300 hover:bg-gray-400">
        &times;
      </button>
      <h2 class="text-2xl">Venue Events</h2>
    </div>
    <div v-if="eventData.length === 0">
      <p class="text-slate-500 italic">No events have been added for this venue yet</p>
    </div>
    <div v-else class="overflow-y-auto h-[550px] flex flex-row flex-wrap justify-center mt-2">
      <div v-for="(event, index) in eventData" :key="index" class="pr-2 pb-2">
        <UCard>
          <template #header>
            <h3 class="font-bold">{{ event.event_title }}</h3>
            <span>{{event.category}}</span>
          </template>

          <NuxtImg class="w-250 h-auto mr-4" :src="`${config.public.supabase.url}/storage/v1/object/public/event_images/${event.photo}`" alt="Event image" width="250" height="auto" preset="event" loading="lazy" />
          <template #footer>
            <span>on: {{ formatDate(event.event_start) }} </span><br />
            <small>for: {{ event.duration }} minutes</small><br />
            <div v-html="countdowns[index]"></div>
          </template>
        </UCard>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useEventStore } from "@/store/event.js";

const eventStore = useEventStore();
const eventData = ref([]);
const config = useRuntimeConfig();
const props = defineProps({
  venueId: Number,
});

onMounted(async () => {
  try {
    eventData.value = await eventStore.fetchVenueEvents(props.venueId);
    console.log(eventData); // Access the fetched event data here
    startCountdowns();
  } catch (error) {
    console.error("Error fetching events:", error);
  }
});

const countdowns = ref([]);  // Array to store countdowns for each event
let countdownInterval: number | undefined = undefined;

function calculateCountdown(eventStartDate: string, durationMinutes: number) {
  const now = new Date(); // Local time
  const eventDate = new Date(eventStartDate); // Interpreted as UTC if ISO 8601 format
  const eventEndDate = new Date(eventDate.getTime() + durationMinutes * 60000); // Duration in milliseconds

  const timeDifference = eventDate.getTime() - now.getTime(); // Difference in milliseconds

  if (timeDifference > 0) {
    // Event hasn't started yet
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

    return `<div>
        Event starts in 
        <div class="flex flex-row justify-between">
        <div class="flex flex-col items-center"><span class="big">${days}</span> <small>day${days !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${hours}</span> <small>hour${hours !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${minutes}</span> <small>minute${minutes !== 1 ? 's' : ''}</small></div>
        <div class="flex flex-col items-center"><span class="big">${seconds}</span> <small>second${seconds !== 1 ? 's' : ''}</small></div>
        </div>
      </div>`;
  } else if (now.getTime() <= eventEndDate.getTime()) {
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

function startCountdowns() {
  countdowns.value = eventData.value.map(event => calculateCountdown(event.event_start, event.duration));

  countdownInterval = setInterval(() => {
    countdowns.value = eventData.value.map(event => calculateCountdown(event.event_start, event.duration));
  }, 1000);
}

onBeforeUnmount(() => {
  clearInterval(countdownInterval);
});

function formatDate(dateString: string): string {
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

  return `${day}${daySuffix(day)} ${month} ${year} at ${hours}:${minutes}`;
}
</script>



<style>
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