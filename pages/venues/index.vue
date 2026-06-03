<template>
  <div class="container mx-auto p-4">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Venues</h1>
      <UButton icon="i-heroicons-plus-circle" label="Add" @click="openAddModal" />
    </div>
    <div class="flex flex-wrap gap-3 items-center mb-4">
      <div class="flex gap-2 flex-1 min-w-[220px]">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by venue name"
          class="input flex-1"
          @keyup.enter="runSearch"
        />
        <UButton
          v-if="showSearchGo"
          label="Go"
          color="amber"
          @click="runSearch"
        />
      </div>
      <select v-model="selectedTown" class="select min-w-[180px]" @change="onTownChange">
        <option value="">All Towns</option>
        <option v-for="town in towns" :key="town.value" :value="town.value">{{ town.label }}</option>
      </select>
    </div>
    <div class="pb-12">
      <!-- Pagination controls -->
      <p v-if="loadError" class="text-center text-red-600 mb-4">{{ loadError }}</p>
      <p v-if="!loadError && (activeSearch || selectedTown || totalItems > 0)" class="text-center text-sm text-gray-600 mb-4">
        <template v-if="activeSearch || selectedTown">
          <span v-if="activeSearch">Search: “{{ activeSearch }}”</span>
          <span v-if="activeSearch && selectedTown"> · </span>
          <span v-if="selectedTown">Town: {{ selectedTownLabel }}</span>
          <button type="button" class="ml-2 text-amber-600 hover:underline" @click="clearFilters">
            Clear filters
          </button>
          <span class="mx-2">·</span>
        </template>
        {{ totalItems }} venues<span v-if="totalPages > 1"> — page {{ currentPage }} of {{ totalPages }}</span>
      </p>
      <div class="flex justify-center mb-4 mt-2">
        <UButton label="Previous" :disabled="currentPage <= 1 || loading" @click="prevPage" />
        <UButton :label="String(currentPage)" class="mx-4" variant="soft" />
        <UButton label="Next" :disabled="currentPage >= totalPages || loading" @click="nextPage" />
      </div>
      <p v-if="loading && !venues.length" class="text-center text-gray-600 mb-4">Loading venues…</p>
      <ul v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="venue in venues" :key="venue.id">
          <UCard class="venue-card">
            <template #header>
              <NuxtLink :to="venuePath(venue.id, venue.slug)" class="font-bold hover:text-amber-600 hover:underline">
                {{ venue.venuename }}
              </NuxtLink>
            </template>
            <VenueCardMedia :venue="venue" class="mb-3" />
            <p class="text-sm text-gray-700">{{ venueAddressLine(venue) }}</p>
            <p v-if="venuePhoneLine(venue)" class="text-sm mt-2">
              <a :href="`tel:${venuePhoneLine(venue)!.replace(/\s/g, '')}`" class="text-amber-600 hover:underline">
                {{ venuePhoneLine(venue) }}
              </a>
            </p>
            <p v-if="venueWebsiteLine(venue)" class="text-sm mt-1">
              <a :href="venueWebsiteLine(venue)!" target="_blank" rel="noopener noreferrer" class="text-amber-600 hover:underline break-all">
                {{ venueWebsiteDisplay(venue) }}
              </a>
            </p>
            <template #footer>
              <div class="flex justify-center">
                <div v-if="user && isAdmin" class="controls">
                  <NuxtLink :to="'/venues/' + venue.id + '/' + venue.slug">
                  <UButton icon="i-heroicons-eye" class="mr-1 text-xs" size="sm" color="teal">
                    </UButton>
                  </NuxtLink>
                  <UButton icon="i-heroicons-eye" class="mr-1 text-xs" size="sm" color="green" @click="openDetailsModal(venue)" />
                  <UButton icon="i-heroicons-pencil-square" class="mr-1 text-xs" size="sm" color="amber" @click="openEditModal(venue, venue.id)" />
                  <UButton icon="i-heroicons-photo" class="mr-1 text-xs" size="sm" color="pink" @click="openPhotoUploadModal(venue, venue.id)" />
                  <UButton icon="i-heroicons-map-pin" class="mr-1 text-xs" size="sm" color="blue" @click="openMapModal(venue, venue.id)" />
                  <UButton icon="i-heroicons-calendar" class="mr-1 text-xs" size="sm" color="violet" @click="openAddEventModal(venue, venue.id)" />
                  <UButton icon="i-heroicons-trash" class="text-xs" size="sm" color="red" @click="openDeleteModal(venue, venue.id)" />
                </div>
                <div v-else>
                  <UButton icon="i-heroicons-eye" class="mr-1 text-xs" size="sm" @click="openDetailsModal(venue)" />
                  <UButton label="Full Details" class="mr-1 text-xs" size="sm">
                    <NuxtLink :to="'/venues/' + venue.id + '/' + venue.slug">Full Details</NuxtLink>
                  </UButton>
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
    <UModal v-model="isPhotoUploadOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isPhotoUploadOpen = false" />
        </div>
        <div class="p-4">
          <input type="file" @change="handleFileUpload" />
          <UButton label="Upload" @click="uploadPhoto" />
        </div>
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
import {
  cleanDbString,
  formatPhone,
  normalizeWebsiteHref,
} from '@/utils/format-venue'

const requestFetch = useRequestFetch();
const venueStore = useVenueStore();
const authStore = useAuthStore();
const { $supabase } = useNuxtApp();
const { user, isAdmin, initializeAuth } = useAuth();
const venueid = ref(null);
const isDetailsOpen = ref(false)
const isAddEditOpen = ref(false)
const isAddEventOpen = ref(false)
const isMapOpen = ref(false)
const isDeleteOpen = ref(false)
const isPhotoUploadOpen = ref(false);
const editMode = ref(false)
const content = ref({});
const currentPage = ref(1);
const totalPages = ref(1);
const paginatedVenues = ref([]);
// Fixed Supabase composables
// NEW STUFF
const itemsPerPage = ref(104);
const totalItems = ref(0);
const venues = ref([]);
const userName = ref('');
const userID = process.env.USER_ID;
const PAGE_SIZE = 104; // Define the page size constant
const selectedFile = ref<File | null>(null);
const searchQuery = ref('');
const activeSearch = ref('');
const selectedTown = ref('');
const towns = ref<Array<{ label: string; value: string }>>([]);
const loading = ref(false);
const loadError = ref('');

type VenuesPage = {
  items: typeof venues.value;
  total: number;
  totalPages: number;
};

function applyVenuesPage(data: VenuesPage) {
  venues.value = data.items ?? [];
  totalItems.value = data.total ?? 0;
  totalPages.value = data.totalPages ?? 1;
}

function venueAddressLine(venue: { address?: string; address2?: string; town?: string; county?: string; postcode?: string }) {
  return [
    cleanDbString(venue.address),
    cleanDbString(venue.address2),
    cleanDbString(venue.town),
    cleanDbString(venue.county),
    cleanDbString(venue.postcode),
  ].filter(Boolean).join(', ')
}

function venuePhoneLine(venue: { telephone?: string }) {
  return formatPhone(venue.telephone)
}

function venueWebsiteLine(venue: { website?: string }) {
  return normalizeWebsiteHref(venue.website)
}

function venueWebsiteDisplay(venue: { website?: string }) {
  return cleanDbString(venue.website) || venueWebsiteLine(venue) || ''
}

const { data: initialVenues, error: initialVenuesError } = await useAsyncData(
  'venues-list-page-1',
  () => requestFetch<VenuesPage>(buildVenuesUrl(1)),
);

function buildVenuesUrl(page = currentPage.value) {
  const params = new URLSearchParams({
    skip: String((page - 1) * itemsPerPage.value),
    take: String(itemsPerPage.value),
  });
  if (selectedTown.value) params.set('town', selectedTown.value);
  if (activeSearch.value) params.set('q', activeSearch.value);
  return `/api/venues?${params}`;
}

const showSearchGo = computed(() => searchQuery.value.trim().length > 4);

function runSearch() {
  const q = searchQuery.value.trim();
  if (q.length <= 4) return;
  activeSearch.value = q;
  currentPage.value = 1;
  fetchAllVenues();
}

function clearFilters() {
  searchQuery.value = '';
  activeSearch.value = '';
  selectedTown.value = '';
  currentPage.value = 1;
  fetchAllVenues();
}

function onTownChange() {
  currentPage.value = 1;
  fetchAllVenues();
}

const selectedTownLabel = computed(() => {
  const match = towns.value.find((t) => t.value === selectedTown.value);
  return match?.label ?? selectedTown.value;
});

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchAllVenues();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchAllVenues();
  }
};

if (initialVenuesError.value) {
  loadError.value =
    'Could not load venues. The database may be unreachable — check Netlify DATABASE_URL uses Supabase port 6543 (transaction pooler).';
} else if (initialVenues.value) {
  applyVenuesPage(initialVenues.value);
}

const fetchAllVenues = async () => {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await requestFetch<VenuesPage>(buildVenuesUrl());
    applyVenuesPage(data);
  } catch (error) {
    console.error('Error loading venues:', error);
    loadError.value =
      'Could not load venues. Please try again — if this persists, verify DATABASE_URL on Netlify (Supabase port 6543, not 5432).';
    venues.value = [];
    totalItems.value = 0;
    totalPages.value = 1;
  } finally {
    loading.value = false;
  }
};

const fetchTowns = async () => {
  try {
    towns.value = await requestFetch<Array<{ label: string; value: string }>>(
      '/api/venues/towns-list',
    );
  } catch {
    towns.value = [];
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
const openAddModal = () => {
  editMode.value = false
  venueid.value = null
  isAddEditOpen.value = true
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
const openPhotoUploadModal = (venue: object, id: Number) => {
  isPhotoUploadOpen.value = true;
  content.value = venue;
  venueid.value = id;
}
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
  }
}
const uploadPhoto = async () => {
  if (!selectedFile.value) {
    toast.add({ title: 'No file selected!' });
    return;
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(selectedFile.value.type)) {
    toast.add({ title: 'Invalid file type!', description: 'Please select a JPG, PNG, WebP, or GIF image.' });
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (selectedFile.value.size > maxSize) {
    toast.add({ title: 'File too large!', description: 'Please select an image smaller than 10MB.' });
    return;
  }

  const fileName = Date.now().toString();
  const { data, error } = await supabase.storage
    .from("venue_images")
    .upload(`public/${fileName}`, selectedFile.value, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading photo:', error);
    toast.add({ title: 'Error uploading photo!', description: error.message });
    return;
  }

  const photo = data.path;
  try {
    await fetch(`/api/venues/${venueid.value}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ photo })
    });

    toast.add({ title: 'Photo uploaded successfully!' });
    isPhotoUploadOpen.value = false;
  } catch (error) {
    console.error('Error updating venue with photo URL:', error);
    toast.add({ title: 'Failed to update venue with photo URL!' });
  }
}
const handleCloseModal = () => {
  isMapOpen.value = false
  isAddEditOpen.value = false
  isDeleteOpen.value = false
  isAddEventOpen.value = false
  editMode.value = false
  venueid.value = null
  fetchAllVenues()
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
  await initializeAuth();
  if (!venues.value.length && !loadError.value) {
    await fetchAllVenues();
  }
  await fetchTowns();
  userName.value = useRuntimeConfig().public.admin;
});

</script>

<style lang="scss" scoped>
.venue-card {
  min-height: 360px;
}

.controls button span{
  font-size: 0.8em!important;
}
.input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
}
.select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
}
</style>