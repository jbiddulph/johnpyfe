<template>
  <div class="container mx-auto p-4 md:p-0">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Events</h1>
      <UButton icon="i-heroicons-plus-circle" label="Add" @click="openAddEventModal()" />
    </div>
    <div class="mt-8 pb-12">
      <!-- Pagination controls -->
      <div class="flex justify-center my-8">
        <!-- <UButton label="First" @click="prevPage(currentPage.value = 1)" /> -->
        <UButton label="Previous" @click="prevPage(eventStore.currentPage.value - 1)" />
        <UButton :label="String(eventStore.currentPage)" class="mx-4" variant="soft" />
        <UButton label="Next" @click="nextPage(eventStore.currentPage + 1)" />
        <!-- <UButton label="Last" @click="nextPage(currentPage = totalPages)" /> -->
      </div>
      <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <li v-for="(event, index) in eventStore.events" :key="index">
              <div class="w-full items-center bg-white dark:bg-gray-900"> <!-- Flex container to align items horizontally -->
                <div class="p-6">
                    <h3 class="font-bold">{{ event.event_title }}</h3>
                    <span>{{event.category}}</span>
                </div>
                <div v-if="userName === user.user_metadata.name">
                  <div class="flex items-center flex-col w-full h-auto relative">
                    <div class="flex justify-center">
                        <!-- <UButton label="Details" class="mr-2" @click="openDetailsModal(event)" /> -->
                        <div v-if="userName === user.user_metadata.name">
                            <!-- <UButton label="Edit" class="mr-2" color="amber" @click="openEditModal(event, event.id)" /> -->
                            <UButton label="Delete" class="mr-2" color="red" @click="openDeleteModal(event, event.id)" />
                            <UButton label="Event" color="amber" @click="openEditEventModal(event)" />
                        </div>
                    </div>
                    <span>on: {{ formatDate(event.event_start) }} </span><br />
                    <img 
                      class="w-full h-[250px] object-cover" 
                      :src="`${config.public.supabase.url}/storage/v1/object/public/event_images/${event.photo}`" 
                      alt="Event image" 
                    />
                    <div class="w-full px-4 py-2 absolute center bottom-0 bg-gray-500 opacity-80 text-white" v-html="countdowns[index]"></div>
                  </div>
                </div>
              </div>
          </li>
      </ul>

    </div>
    <UModal v-model="isDetailsOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              View Details
            </h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isDetailsOpen = false" />
          </div>
        </template>
        <eventDetails class="h-auto w-auto" :content="content" :venue="venue" />
      </UCard>
    </UModal>
    <!-- <UModal v-model="isAddEditOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEditOpen = false" />
        </div>
        Venue ID: {{ venueid }}
        <event-addEditEvent class="h-48" :venueid="venueid" @closeModal="handleCloseModal" />
      </UCard>
    </UModal> -->
    <UModal v-model="isAddEventOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEventOpen = false" />
        </div>
        <event-addEvent :editing="editMode" :venueid="venueid" :event="content" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
    <!-- <UModal v-model="isMapOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isMapOpen = false" />
        </div>
        <venue-mapVenue class="h-48" :editing="editMode" :venueid="venueid" @closeModal="handleCloseModal" />
      </UCard>
    </UModal> -->
    <UModal v-model="isDeleteOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isDeleteOpen = false" />
        </div>
        <event-deleteEvent class="h-48" :content="content" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
  </div>
</template>

<script lang="ts" setup>
useHead({
  title: 'Events in Pubs and Venues around the UK', // Optional: Set the page title
  meta: [
    { name: 'keywords', content: 'Events, Pubs, venues, UK' },
    { name: 'description', content: 'Venues and pubs for events in the UK' }
  ]
});
const toast = useToast();
import { useEventStore } from "@/store/event.js";
import { useAuthStore } from "@/store/auth.js";
const eventStore = useEventStore();
const authStore = useAuthStore();
const venueid = ref(null);
const eventid = ref(null);
const isDetailsOpen = ref(false)
const isAddEditOpen = ref(false)
const isAddEventOpen = ref(false)
const isMapOpen = ref(false)
const isDeleteOpen = ref(false)
const editMode = ref(false)
const content = ref({});
const currentPage = ref(1);
const totalPages = ref(1);
const paginatedEvents = ref([]);
const itemsPerPage = ref(104);
const totalItems = ref(0);
const event = reactive({});
const venues = ref([]);
const events = ref([]);
const userName = ref('');
const PAGE_SIZE = 104; // Define the page size constant
const config = useRuntimeConfig()
const user = useSupabaseUser();
const props = defineProps({
  venueId: Number,
});
const imageUrl = (photoUrl) => {
  return photoUrl.replace('/media/', '');
};
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    eventStore.fetchAllEvents();
  }
}
const nextPage = () => {
  // if (currentPage.value * itemsPerPage.value < totalItems.value) {
    currentPage.value++;
    eventStore.fetchAllEvents();
  // }
}

const openDetailsModal = (event: { id: number }) => {
  fetchEventDetails(event.id);
  isDetailsOpen.value = true;
  content.value = event;
}
const fetchEventDetails = async (eventId: number) => {
    try {
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events/${eventId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("EVENT DATA: ", data);
        event.value = data;
        console.log("event: ", event.value);
    } catch (error) {
        console.error("Failed to fetch venue details:", error);
    }
}
const openDeleteModal = (event: object) => {
  isDeleteOpen.value = true
  content.value = event
}
const openEditModal = (event: object, id: Number) => {
  isAddEditOpen.value = true
  content.value = event
  editMode.value = true
  eventid.value = id
}
const openAddEventModal = () => {
  console.log("clicked");
  isAddEventOpen.value = true
  editMode.value = true
  content.value = event
  console.log("content: ", content.value);
}
const openEditEventModal = (event) => {
  console.log("clicked");
  isAddEventOpen.value = true
  editMode.value = true
  content.value = event
}
const handleCloseModal = () => {
  isMapOpen.value = false
  isAddEditOpen.value = false
  isDeleteOpen.value = false
  isAddEventOpen.value = false
  toast.add({ title: 'Deleted Venue!' })
  // fetch venues again
  // venueStore.fetchVenues()
}

watch(isAddEditOpen, (newValue: any) => {
  if (!newValue) {
    editMode.value = false;
  }
});
watch(isMapOpen, (newValue: any) => {
  if (!newValue) {
    editMode.value = false;
  }
});
onMounted( async() => {
  // await eventStore.fetchAllEvents();
  userName.value = useRuntimeConfig().public.userName;
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
        <div class="flex flex-row justify-between" id="countdown">
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

<style lang="scss">
.big{
  font-size: 3rem;
  font-stretch: extra-condensed;
  font-weight: 100;
  color: rgba($color: #ddcf00, $alpha: 1.0);
}
</style>