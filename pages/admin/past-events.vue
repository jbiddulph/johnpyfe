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
                />
                <div class="w-full px-4 py-2 absolute center bottom-0 bg-red-600 opacity-90 text-white">
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
  </div>
</template>

<script lang="ts" setup>
useHead({
  title: 'Past Events - Admin Panel',
  meta: [
    { name: 'description', content: 'View past events (Admin only)' }
  ]
});

const user = useSupabaseUser();
const config = useRuntimeConfig();

// Check if user is admin
const isAdmin = computed(() => {
  if (!user.value?.email) return false;
  return user.value.email === config.public.admin;
});

// Redirect if not admin
watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/events');
  }
});

const events = ref([]);
const loading = ref(true);
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const itemsPerPage = ref(20);

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

const fetchPastEvents = async () => {
  if (!isAdmin.value) return;
  
  loading.value = true;
  try {
    const skip = (currentPage.value - 1) * itemsPerPage.value;
    const response = await fetch(`${config.public.baseURL}/api/events/past?skip=${skip}&take=${itemsPerPage.value}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
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

onMounted(() => {
  if (isAdmin.value) {
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

