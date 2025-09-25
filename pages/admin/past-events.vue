<template>
  <div class="container mx-auto p-4">
    <div class="flex w-full justify-between items-center">
      <h1 class="text-4xl font-bold my-8">Past Events (Admin Only)</h1>
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-600">Total: {{ totalItems }}</span>
        <NuxtLink to="/events" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          View Upcoming Events
        </NuxtLink>
      </div>
    </div>
    
    <!-- Filters -->
    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- City Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by City</label>
          <USelectMenu
            v-model="selectedCity"
            :options="cities"
            option-attribute="name"
            value-attribute="id"
            placeholder="All Cities"
            searchable
            @change="applyFilters"
          />
        </div>
        
        <!-- Venue Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Venue</label>
          <USelectMenu
            v-model="selectedVenue"
            :options="venues"
            option-attribute="venuename"
            value-attribute="id"
            placeholder="All Venues"
            searchable
            @change="applyFilters"
          />
        </div>
        
        <!-- Clear Filters -->
        <div class="flex items-end">
          <UButton 
            label="Clear Filters" 
            color="gray" 
            variant="outline"
            @click="clearFilters"
            :disabled="!selectedCity && !selectedVenue"
          />
        </div>
      </div>
    </div>

    <div class="pb-12">
      <!-- Pagination controls -->
      <div class="flex justify-center mb-4 mt-2">
        <UButton label="Previous" @click="prevPage" :disabled="currentPage <= 1" />
        <UButton :label="String(currentPage)" class="mx-4" variant="soft" />
        <UButton label="Next" @click="nextPage" :disabled="currentPage >= totalPages" />
      </div>
      
      <div v-if="loading" class="text-center py-8">
        <div class="spinner mx-auto"></div>
        <p>Loading past events...</p>
      </div>
      
      <div v-else-if="events.length === 0" class="text-center py-8">
        <p class="text-gray-600">No past events found.</p>
      </div>
      
      <ul v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <li v-for="(event, index) in events" :key="event.id">
          <!-- Admin controls -->
          <div class="flex justify-center mb-2">
            <UButton label="Delete" class="mr-2 text-xs" color="red" @click="openDeleteModal(event)" />
            <UButton label="Edit" class="text-xs" color="amber" @click="openEditEventModal(event)" />
          </div>
          
          <div class="w-full items-center bg-white dark:bg-gray-900 rounded-md border border-gray-200">
            <div class="p-4">
              <h2 class="font-bold text-2xl">{{ event.event_title }}</h2>
              <h3 class="text-gray-600">{{ event.category.name }} at 
                <NuxtLink :to="`/venues/${event.listing.id}/${event.listing.slug}`" class="text-blue-600 hover:underline">
                  {{ event.listing.venuename }}
                </NuxtLink>
              </h3>
              <span class="text-gray-500">
                <NuxtLink :to="`/town/${event.city.slug}`" class="text-blue-600 hover:underline">
                  {{ event.city.name }}
                </NuxtLink>
              </span>
            </div>
            <div>
              <div class="calendar flex items-center flex-col w-full h-auto relative">
                <div class="bg-red-100 rounded-lg absolute -top-2 right-4 border-2 border-red-300">
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
                  class="w-full h-[250px] object-cover opacity-75" 
                  :src="`${useRuntimeConfig().public.eventImgFolder}${event.photo}`" 
                  alt="Event image"
                  sizes="sm:100vw md:50vw lg:25vw"
                />
                <div class="w-full px-4 py-2 absolute center bottom-0 bg-red-600 bg-opacity-90 text-white font-bold text-lg shadow-lg z-10">
                  <div class="flex items-center justify-center">
                    <div class="flex items-center">
                      <span class="mr-2">🔴</span>
                      <span class="font-bold">Event Ended</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
    
    <!-- Edit Event Modal -->
    <UModal v-model="isEditEventOpen" prevent-close>
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <div class="flex justify-end">
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isEditEventOpen = false" />
        </div>
        <event-addEvent :editing="true" :event="content" @closeModal="handleCloseModal" />
      </UCard>
    </UModal>
    
    <!-- Delete Event Modal -->
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
  title: 'Past Events - Admin Panel',
  meta: [
    { name: 'description', content: 'View past events (Admin only)' }
  ]
});

const config = useRuntimeConfig();
const { user, isAdmin, initializeAuth } = useAuth();

// Initialize global authentication state
onMounted(async () => {
  console.log('Admin page mounted, initializing auth...');
  await initializeAuth();
  console.log('Auth initialized, user:', user.value?.email, 'isAdmin:', isAdmin.value);
});

// Redirect if not admin
watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/events');
  }
});

const events = ref<any[]>([]);
const loading = ref(true);
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const itemsPerPage = ref(20);

// Filter state
const selectedCity = ref<number | null>(null);
const selectedVenue = ref<number | null>(null);
const cities = ref<any[]>([]);
const venues = ref<any[]>([]);
const allVenues = ref<any[]>([]);

// Modal state
const isEditEventOpen = ref(false);
const isDeleteOpen = ref(false);
const content = ref({});
const toast = useToast();

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getUTCFullYear().toString().slice(-2);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');

  const daySuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
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
};

// Fetch cities for filter
const fetchCities = async () => {
  try {
    const response = await fetch(`${config.public.baseURL}/api/cities`);
    if (response.ok) {
      const data = await response.json();
      cities.value = data;
    }
  } catch (error) {
    console.error('Error fetching cities:', error);
  }
};

// Fetch venues for filter
const fetchVenues = async () => {
  try {
    const response = await fetch(`${config.public.baseURL}/api/venues`);
    if (response.ok) {
      const data = await response.json();
      allVenues.value = data;
      venues.value = data;
    }
  } catch (error) {
    console.error('Error fetching venues:', error);
  }
};

// Filter venues by selected city
const filterVenuesByCity = () => {
  if (selectedCity.value) {
    venues.value = allVenues.value.filter(venue => venue.cityId === selectedCity.value);
    // Reset venue selection if current venue is not in filtered list
    if (selectedVenue.value && !venues.value.find(v => v.id === selectedVenue.value)) {
      selectedVenue.value = null;
    }
  } else {
    venues.value = allVenues.value;
  }
};

// Apply filters
const applyFilters = () => {
  currentPage.value = 1; // Reset to first page
  fetchPastEvents();
};

// Clear all filters
const clearFilters = () => {
  selectedCity.value = null;
  selectedVenue.value = null;
  venues.value = allVenues.value;
  currentPage.value = 1;
  fetchPastEvents();
};

const fetchPastEvents = async () => {
  console.log('fetchPastEvents called, isAdmin:', isAdmin.value, 'user:', user.value?.email);
  
  if (!isAdmin.value) {
    console.log('Not admin, skipping fetch');
    return;
  }
  
  loading.value = true;
  try {
    const skip = (currentPage.value - 1) * itemsPerPage.value;
    let url = `${config.public.baseURL}/api/events/past?skip=${skip}&take=${itemsPerPage.value}`;
    
    // Add filter parameters
    const params = new URLSearchParams();
    if (selectedCity.value) params.append('cityId', selectedCity.value);
    if (selectedVenue.value) params.append('venueId', selectedVenue.value);
    
    if (params.toString()) {
      url += `&${params.toString()}`;
    }
    
    console.log('Fetching from URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched past events:', data.length, 'events');
    events.value = data;
    totalItems.value = data.length;
    
    const totalPagesCount = Math.ceil(totalItems.value / itemsPerPage.value);
    totalPages.value = totalPagesCount;
  } catch (error) {
    console.error('Error loading past events:', error);
    events.value = [];
  } finally {
    loading.value = false;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchPastEvents();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchPastEvents();
  }
};

// Modal methods
const openEditEventModal = (event: any) => {
  console.log("Opening edit modal for event:", event);
  isEditEventOpen.value = true;
  content.value = event;
};

const openDeleteModal = (event: any) => {
  console.log("Opening delete modal for event:", event);
  isDeleteOpen.value = true;
  content.value = event;
};

const handleCloseModal = () => {
  isEditEventOpen.value = false;
  isDeleteOpen.value = false;
  toast.add({ title: 'Event updated!' });
  // Refresh the events list
  fetchPastEvents();
};

// Watch for city selection to filter venues
watch(selectedCity, () => {
  filterVenuesByCity();
});

// Watch for admin status changes and fetch events
watchEffect(() => {
  if (isAdmin.value && user.value) {
    fetchCities();
    fetchVenues();
    fetchPastEvents();
  }
});
</script>

<style scoped>
.spinner {
  border: 8px solid rgba(0, 0, 0, 0.1);
  border-top-color: #007bff;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.calendar {
  font-family: 'Kanit', sans-serif;
}
</style>

