<template>
  <div class="container mx-auto">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Venues</h1>
      <UButton icon="i-heroicons-plus-circle" label="Add" @click="openAddModal(venue)" />
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
      <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(venue, index) in venues" :key="index">
          <UCard class="h-[250px]">
            <template #header>
              <h3 class="font-bold">{{ venue.venuename }}</h3>
            </template>
            <div>{{ venue.venuename }}, {{ venue.town }}, {{ venue.county }}</div> 
            <template #footer>
              <div class="flex justify-center">
                <div v-if="userName === user.user_metadata.email" class="controls">
                  <UButton icon="i-heroicons-eye" class="mr-1 text-xs" size="sm" @click="openDetailsModal(venue)" />
                  <UButton icon="i-heroicons-pencil-square" class="mr-1 text-xs" size="sm" color="amber" @click="openEditModal(venue, venue.id)" />
                  <UButton icon="i-heroicons-map-pin" class="mr-1 text-xs" size="sm" color="blue" @click="openMapModal(venue, venue.id)" />
                  <UButton icon="i-heroicons-calendar" class="mr-1 text-xs" size="sm" color="violet" @click="openAddEventModal(venue, venue.id)" />
                  <UButton icon="i-heroicons-trash" class="text-xs" size="sm" color="red" @click="openDeleteModal(venue, venue.id)" />
                </div>
                <div v-else>
                  <UButton label="Details" class="mr-1 text-xs" size="sm" @click="openDetailsModal(venue)" />
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
        <venueDetails class="h-48" :content="content" />
      </UCard>
    </UModal>
    <UModal v-model="isAddEditOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEditOpen = false" />
        </div>
        <venue-addEditVenue :editing="editMode" class="h-48" :venueid="venueid" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
    <UModal v-model="isAddEventOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isAddEventOpen = false" />
        </div>
        <event-addEvent :editing="editMode" :venue="venue" :venueid="venueid" @closeModal="handleCloseModal" />
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
    </UModal>
  </div>
</template>

<script lang="ts" setup>
useHead({
  title: 'Pubs and Venues in the UK', // Optional: Set the page title
  meta: [
    { name: 'keywords', content: 'Venues, Pubs, Bars, UK' },
    { name: 'description', content: 'Venues and pubs for events around the UK' }
  ]
});
const toast = useToast();
import { useVenueStore } from "@/store/venue.js";
import { useAuthStore } from "@/store/auth.js";
import axios from "axios";
const venueStore = useVenueStore();
const authStore = useAuthStore();
const venueid = ref(null);
const isDetailsOpen = ref(false)
const isAddEditOpen = ref(false)
const isAddEventOpen = ref(false)
const isMapOpen = ref(false)
const isDeleteOpen = ref(false)
const editMode = ref(false)
const content = ref({});
const currentPage = ref(1);
const totalPages = ref(1);
const paginatedVenues = ref([]);
const user = useSupabaseUser();
// NEW STUFF
const itemsPerPage = ref(104);
const totalItems = ref(0);
const venues = ref([]);
const userName = ref('');
const userID = process.env.USER_ID;
const PAGE_SIZE = 104; // Define the page size constant
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchAllVenues();
  }
}
const nextPage = () => {
  // if (currentPage.value * itemsPerPage.value < totalItems.value) {
    currentPage.value++;
    fetchAllVenues();
  // }
}
const fetchAllVenues = async () => {
  try {
    const skip = (currentPage.value - 1) * itemsPerPage.value;
    const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/venues?skip=${skip}&take=${itemsPerPage.value}`);
    const data = await response.json();
    venues.value = data;
    totalItems.value = data.length;
    const totalPagesCount = Math.ceil(totalItems.value / itemsPerPage.value);
    totalPages.value = totalPagesCount;
  } catch (error) {
    console.error('Error loading venues:', error);
  }
};
const openDetailsModal = (venue: object) => {
  isDetailsOpen.value = true
  content.value = venue
}
const editDetailsModal = (venue: object) => {
  isDetailsOpen.value = true
  content.value = venue
}
const openAddModal = (venue: object) => {
  isAddEditOpen.value = true
  content.value = venue
}
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
const openAddEventModal = (venue: object, id: Number) => {
  isAddEventOpen.value = true
  content.value = venue
  // editMode.value = true
  venueid.value = id
}
const openMapModal = (venue: object, id: Number) => {
  isMapOpen.value = true
  content.value = venue
  editMode.value = true
  venueid.value = id
}
const handleCloseModal = () => {
  isMapOpen.value = false
  isAddEditOpen.value = false
  isDeleteOpen.value = false
  isAddEventOpen.value = false
  toast.add({ title: 'Deleted Venue!' })
  //fetch venues again
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

onMounted(async () => {
  fetchAllVenues();
  // userName.value = process.env.USER_NAME;
  userName.value = useRuntimeConfig().public.admin;
});

</script>

<style lang="scss" scoped>
.controls button span{
  font-size: 0.8em!important;
}
</style>