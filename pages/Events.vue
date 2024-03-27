<template>
  <div class="container mx-auto">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Events</h1>
      <UButton icon="i-heroicons-plus-circle" label="Add" @click="openAddModal(event)" />
    </div>
    <div class="mt-8 pb-12">
      <!-- Pagination controls -->
      <div class="flex justify-center my-8">
        <UButton label="Previous" v-if="currentPage > 1" @click="loadPage(currentPage - 1)" />
        <span class="mx-4">{{ currentPage }} / {{ totalPages }}</span>
        <UButton label="Next" v-if="currentPage < totalPages" @click="loadPage(currentPage + 1)" />
      </div>
      <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(event, index) in paginatedEvents" :key="index">
          <UCard class="h-[250px]">
            <template #header>
              <h3 class="font-bold">{{ event.event }} at Venue: {{ event.venue }}</h3>
            </template>
            <div>{{ event.event_date }}, {{ event.time_start }}, {{ event.time_end }}</div> 
            <template #footer>
              <div class="flex justify-center">
                <UButton label="Details" class="mr-2" @click="openDetailsModal(event)" />
                <div v-if="authStore.user.id === 1">
                  <!-- <UButton label="Edit" class="mr-2" color="amber" @click="openEditModal(event, event.id)" />
                  <UButton label="Delete" color="red" @click="openDeleteModal(event, event.id)" />
                  <UButton label="Event" color="green" @click="openAddEventModal(event, event.id)" /> -->
                </div>
              </div>
            </template>
          </UCard>
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
        <eventDetails class="h-48" :content="content" />
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
    <!-- <UModal v-model="isAddEventOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEventOpen = false" />
        </div>
        <event-addEvent :editing="editMode" :venueid="venueid" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
    <UModal v-model="isMapOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isMapOpen = false" />
        </div>
        <venue-mapVenue class="h-48" :editing="editMode" :venueid="venueid" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
    <UModal v-model="isDeleteOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isDeleteOpen = false" />
        </div>
        <venue-deleteVenue class="h-48" :content="content" @closeModal="handleCloseModal" />
      </UCard>
    </UModal> -->
  </div>
</template>

<script lang="ts" setup>
const toast = useToast();
import { useEventStore } from "@/store/event.js";
import { useAuthStore } from "@/store/auth.js";
import axios from "axios";
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

const PAGE_SIZE = 104; // Define the page size constant

const loadPage = async (page: any) => {
  try {
    const token = localStorage.getItem("userToken");
    const BASE_URL = useRuntimeConfig().public.apiURL;
    const response = await axios.get(`http://127.0.0.1:8000/api/events/all/?page=${page}`, {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Token ${token}`,
          }
        });
    paginatedEvents.value = response.data.results;
    
    // Calculate total pages
    const totalPagesCount = Math.ceil(response.data.count / PAGE_SIZE);
    currentPage.value = page;
    totalPages.value = totalPagesCount;
  } catch (error) {
    console.error('Error loading venues:', error);
  }
};
const openDetailsModal = (event: object) => {
  isDetailsOpen.value = true
  content.value = event
}
// const editDetailsModal = (venue: object) => {
//   isDetailsOpen.value = true
//   content.value = venue
// }
// const openAddModal = (venue: object) => {
//   isAddEditOpen.value = true
//   content.value = venue
// }
// const openDeleteModal = (venue: object) => {
//   isDeleteOpen.value = true
//   content.value = venue
// }
// const openEditModal = (venue: object, id: Number) => {
//   isAddEditOpen.value = true
//   content.value = venue
//   editMode.value = true
//   venueid.value = id
// }
// const openAddEventModal = (venue: object, id: Number) => {
//   isAddEventOpen.value = true
//   content.value = venue
//   editMode.value = true
//   venueid.value = id
// }
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
  venueStore.fetchVenues()
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
  await eventStore.fetchAllEvents();
  loadPage(currentPage.value);
});
</script>

<style lang="scss" scoped>

</style>