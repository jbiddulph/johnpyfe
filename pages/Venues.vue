<template>
  <div class="container mx-auto">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Venues</h1>
      <UButton icon="i-heroicons-plus-circle" label="Add" @click="openAddModal(venue)" />
    </div>
    <div class="mt-8 pb-12">
      <UPagination :ui="{ wrapper: 'justify-center'}" :model-value="currentPage" v-if="totalPages > 1" :page-count="5" :total="totalPages" @change="handlePageChange" />
      <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(venue, index) in paginatedVenues" :key="index">
          <UCard class="h-[250px]">
            <template #header>
              <h3 class="font-bold">{{ venue.venuename }}</h3>
            </template>
            <div>{{ venue.venuename }}, {{ venue.town }}, {{ venue.county }}</div> 
            <template #footer>
              <div class="flex justify-center">
                <UButton label="Details" class="mr-2" @click="openDetailsModal(venue)" />
                <UButton label="Edit" class="mr-2" color="amber" @click="openEditModal(venue, venue.id)" />
                <UButton label="<>" class="mr-2" color="blue" @click="openMapModal(venue, venue.id)" />
                <UButton label="Delete" color="red" @click="openDeleteModal(venue, venue.id)" />
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
        <venue-addEditVenue class="h-48" :editing="editMode" :venueid="venueid" @closeModal="handleCloseModal" />
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

<script setup lang="ts">
const toast = useToast();
import { useVenueStore } from "@/store/venue.js";
const venueStore = useVenueStore();
const venueid = ref(null);
const isDetailsOpen = ref(false)
const isAddEditOpen = ref(false)
const isMapOpen = ref(false)
const isDeleteOpen = ref(false)
const editMode = ref(false)
const content = ref({});
const currentPage = ref(1); // Current page
const itemsPerPage = 8; // Number of items per page
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
  toast.add({ title: 'Deleted Venue!' })
  venueStore.fetchVenues()
}
// Watch for changes in currentPage and update paginatedVenues accordingly
watch(currentPage, (newPage) => {
  fetchVenues(newPage);
});

async function fetchVenues(page: number) {
  await venueStore.fetchVenues(page, itemsPerPage);
}

// Fetch venues on component mount
onMounted(async () => {
  await fetchVenues(currentPage.value);
});

// Computed property to calculate paginated venues
const paginatedVenues = computed(() => {
  const venues = venueStore.venues?.venues; // Use optional chaining to access nested properties
  if (!venues) return []; // Return an empty array if venues is undefined
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = currentPage.value * itemsPerPage;
  return venues.slice(start, end);
});

// Computed property to calculate total number of pages
const totalPages = computed(() => {
  return Math.ceil(venueStore.venues.total / itemsPerPage);
});

// Method to handle page change
function handlePageChange(page: number) {
  currentPage.value = page;
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
  await venueStore.fetchVenues();
});
</script>

<style lang="scss" scoped>

</style>