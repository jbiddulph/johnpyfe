<template>
  <div class="container mx-auto">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Venues</h1>
      <UButton icon="i-heroicons-plus-circle" label="Add" @click="openAddModal(venue)" />
    </div>
    <div class="mt-8">
      <ul class="flex flex-row flex-wrap">
        <li v-for="(venue, index) in venueStore.venues.venues" :key="index" class="flex-shrink-0 mr-4 mb-4">
          <UCard>
            <template #header>
              {{ venue.venuename }}
            </template>
            <div>{{ venue.venuename }}, {{ venue.town }}, {{ venue.county }}</div> 
            <template #footer>
              <UButton label="Details" class="mr-2" @click="openDetailsModal(venue)" />
              <UButton label="Edit" @click="openEditModal(venue, venue.id)" />
            </template>
          </UCard>
            <!-- <UButton label="Edit" @click="openEditModal(venue)" />
            <UButton label="Delete" @click="openDeleteModal(venue)" /> -->
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
        <venue-addEditVenue class="h-48" :editing="editMode" :venueid="venueid"  />
      </UCard>
    </UModal>
  </div>
</template>

<script lang="ts" setup>
import { useVenueStore } from "@/store/venue.js";
const venueStore = useVenueStore();
const venueid = ref(null);
const isDetailsOpen = ref(false)
const isAddEditOpen = ref(false)
const editMode = ref(false)
const content = ref({});
const fetchVenues = async () => {
  await venueStore.fetchVenues();
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
const openEditModal = (venue: object, id: Number) => {
  isAddEditOpen.value = true
  content.value = venue
  editMode.value = true
  venueid.value = id
}
watch(isAddEditOpen, (newValue: any) => {
  if (!newValue) {
    editMode.value = false;
  }
});
onMounted(() => {
  fetchVenues()
});
</script>

<style lang="scss" scoped>

</style>