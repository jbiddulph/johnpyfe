<template>
  <div class="container mx-auto p-4">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Events</h1>
      <UButton v-if="user" icon="i-heroicons-plus-circle" label="Add" @click="openAddEventModal()" />
    </div>
    <div class="pb-12">
      <!-- Pagination controls -->
      <div class="flex justify-center mb-4 mt-2">
        <!-- <UButton label="First" @click="prevPage(currentPage.value = 1)" /> -->
        <UButton label="Previous" @click="prevPage(eventStore.currentPage.value - 1)" />
        <UButton :label="String(eventStore.currentPage)" class="mx-4" variant="soft" />
        <UButton label="Next" @click="nextPage(eventStore.currentPage + 1)" />
        <!-- <UButton label="Last" @click="nextPage(currentPage = totalPages)" /> -->
      </div>
      <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <li v-for="(event, index) in eventStore.events" :key="index">
            <!-- Admin controls -->
            <div class="flex justify-center mb-2">
              <div v-if="user && isAdmin">
                  <UButton label="Delete" class="mr-2 text-xs" color="red" @click="openDeleteModal(event)" />
                  <UButton label="Edit" class="text-xs" color="amber" @click="openEditEventModal(event)" />
              </div>
            </div>
            <event-listing 
              :event="event"
              :index="index" 
            />
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
    <UModal v-model="isAddEventOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEventOpen = false" />
        </div>
        <event-addEvent :editing="editMode" :venueid="venueid" :event="content" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
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
const { $supabase } = useNuxtApp();
const { user, isAdmin, initializeAuth } = useAuth();
// Fixed Supabase composables
const props = defineProps({
  venueId: Number,
});
const imageUrl = (photoUrl: string) => {
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
  console.log("clicked - adding new event");
  isAddEventOpen.value = true
  editMode.value = false  // This should be false for adding new events
  content.value = {}      // Empty object for new events
  console.log("content for new event: ", content.value);
}
const openEditEventModal = (event: any) => {
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
  toast.add({ title: 'Event updated!' })
  // Refresh the events list
  eventStore.fetchAllEvents()
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
  // Initialize authentication
  await initializeAuth();
  
  // await eventStore.fetchAllEvents();
  userName.value = useRuntimeConfig().public.userName;
  try {
    eventStore.fetchAllEvents();
    if(props.venueId){
      eventStore.events = await eventStore.fetchVenueEvents(props.venueId);
    }
  } catch (error) {
    console.error("Error fetching events:", error);
  }
});
</script>

<style lang="scss">
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
</style>