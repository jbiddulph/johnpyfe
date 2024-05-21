<template>
  <div class="container mx-auto">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Events</h1>
      <UButton icon="i-heroicons-plus-circle" label="Add" @click="openAddEventModal()" />
    </div>
    <div class="mt-8 pb-12">
      <!-- Pagination controls -->
      <div class="flex justify-center my-8">
        <!-- <UButton label="First" @click="prevPage(currentPage.value = 1)" /> -->
        <UButton label="Previous" @click="prevPage(currentPage.value - 1)" />
        <UButton :label="currentPage" class="mx-4" variant="soft" />
        <UButton label="Next" @click="nextPage(currentPage + 1)" />
        <!-- <UButton label="Last" @click="nextPage(currentPage = totalPages)" /> -->
      </div>
      <ul class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- <li v-for="(event, index) in paginatedEvents" :key="index"> -->
      <li v-for="(event, index) in events" :key="index">
        <div class="flex items-center bg-white dark:bg-gray-900"> <!-- Flex container to align items horizontally -->
          <img class="w-250 h-auto mr-4" :src="`${config.public.supabase.url}/storage/v1/object/public/event_images/${event.photo}`" alt="Event image" width="250px" /> <!-- Image -->
          <div class="flex content-between flex-wrap"> <!-- Description -->
              <h3 class="font-bold text-black dark:text-white">{{ event.event_title }} at Venue: {{ event.venue }}</h3>
                <div class="text-black dark:text-white">{{ event.event_date }}, {{ event.time_start }} - {{ event.time_end }}</div>
                <div class="flex justify-center">
                    <UButton label="Details" class="mr-2" @click="openDetailsModal(event)" />
                    <div v-if="userName === user.user_metadata.name">
                        <UButton label="Edit" class="mr-2" color="amber" @click="openEditModal(event, event.id)" />
                        <UButton label="Delete" color="red" @click="openDeleteModal(event, event.id)" />
                        <UButton label="Event" color="green" @click="openAddEventModal(event, event.id)" />
                    </div>
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
    <UModal v-model="isAddEditOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEditOpen = false" />
        </div>
        <venue-addEditVenue class="h-48" :venueid="venueid" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
    <UModal v-model="isAddEventOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEventOpen = false" />
        </div>
        <event-addEvent :editing="editMode" :venueid="venueid" @closeModal="handleCloseModal" />
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
const venue = reactive({});
const venues = ref([]);
const events = ref([]);
const userName = ref('');
const PAGE_SIZE = 104; // Define the page size constant
const config = useRuntimeConfig()
const user = useSupabaseUser();
const imageUrl = (photoUrl) => {
  return photoUrl.replace('/media/', '');
};
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchAllEvents();
  }
}
const nextPage = () => {
  // if (currentPage.value * itemsPerPage.value < totalItems.value) {
    currentPage.value++;
    fetchAllEvents();
  // }
}
const fetchAllEvents = async () => {
  try {
    // const BASE_URL = useRuntimeConfig().public.apiURL;
    const skip = (currentPage.value - 1) * itemsPerPage.value;
    const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events?skip=${skip}&take=${itemsPerPage.value}`);
    const data = await response.json();
    events.value = data;
    console.log("events.value: ", events.value);
    totalItems.value = data.length;
    const totalPagesCount = Math.ceil(totalItems.value / itemsPerPage.value);
    totalPages.value = totalPagesCount;
  } catch (error) {
    console.error('Error loading venues:', error);
  }
};
const openDetailsModal = (event: { venue_id: number }) => {
  fetchVenueDetails(event.venue_id);
  isDetailsOpen.value = true;
  content.value = event;
}
const fetchVenueDetails = async (venueId: number) => {
    try {
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/${venueId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        venue.value = data;
        console.log("venue: ", venue.value);
    } catch (error) {
        console.error("Failed to fetch venue details:", error);
    }
}
// const editDetailsModal = (venue: object) => {
//   isDetailsOpen.value = true
//   content.value = venue
// }
// const openAddModal = (venue: object) => {
//   isAddEditOpen.value = true
//   content.value = venue
// }
const openDeleteModal = (venue: object) => {
  isDeleteOpen.value = true
  content.value = venue
}
const openEditModal = (venue: object, id: Number) => {
  isAddEditOpen.value = true
  content.value = venue
  editMode.value = true
  venueid.value = id
}
const openAddEventModal = () => {
  console.log("clicked");
  isAddEventOpen.value = true
  editMode.value = true
}
// const openMapModal = (venue: object, id: Number) => {
//   isMapOpen.value = true
//   content.value = venue
//   editMode.value = true
//   venueid.value = id
// }
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
  fetchAllEvents();
  userName.value = "John Biddulph";
});
</script>

<style lang="scss" scoped>

</style>