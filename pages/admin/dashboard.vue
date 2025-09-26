<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Dashboard</h1>
    
    <!-- Bulk Event Creation -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
      <h2 class="text-2xl font-semibold mb-4">Bulk Create Events</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- City Selection -->
        <div>
          <label class="block text-sm font-medium mb-2">Select City</label>
          <USelect
            v-model="selectedCity"
            :options="cities"
            option-attribute="name"
            value-attribute="id"
            placeholder="Choose a city..."
          />
        </div>
        
        <!-- Venue Selection -->
        <div>
          <label class="block text-sm font-medium mb-2">Select Venue</label>
          <USelectMenu
            v-model="selectedVenue"
            :loading="venueLoading"
            :searchable="searchVenues"
            placeholder="Search for a venue..."
            option-attribute="concatenatedName"
            option-id-attribute="id"
            trailing
            by="id"
          />
        </div>
      </div>
      
      <!-- Event Details -->
      <div class="mt-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium mb-2">Category</label>
            <USelect
              v-model="eventTemplate.categoryId"
              :options="categories"
              option-attribute="name"
              value-attribute="id"
              placeholder="Choose a category..."
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">No of Events</label>
            <USelect
              v-model="eventCount"
              :options="eventCountOptions"
              placeholder="Select number of events..."
            />
          </div>
        </div>
      </div>
      
      <!-- Create Button -->
      <div class="mt-6">
        <UButton 
          @click="createBulkEvents" 
          :loading="isCreating"
          :disabled="!selectedCity || !selectedVenue || !eventCount"
          color="green"
          size="lg"
        >
          Create {{ eventCount || 0 }} Events
        </UButton>
      </div>
      
      <!-- Progress -->
      <div v-if="isCreating" class="mt-4">
        <div class="bg-gray-200 rounded-full h-2.5">
          <div 
            class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <p class="text-sm text-gray-600 mt-2">{{ progress }}% Complete ({{ createdCount }}/{{ eventCount }})</p>
      </div>
    </div>
    
    <!-- Recently Created Untitled Events -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
      <h2 class="text-2xl font-semibold mb-4">Recently Created Untitled Events</h2>
      
      <!-- Filters for Untitled Events -->
      <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- City Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by City</label>
            <USelectMenu
              v-model="untitledSelectedCity"
              :options="untitledCities"
              option-attribute="name"
              value-attribute="id"
              placeholder="All Cities"
              searchable
              @change="applyUntitledFilters"
            />
          </div>
          
          <!-- Venue Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Venue</label>
            <USelect
              v-model="untitledSelectedVenue"
              :options="untitledVenues"
              option-attribute="venuename"
              value-attribute="id"
              placeholder="All Venues"
              @change="applyUntitledFilters"
            />
          </div>
          
          <!-- Clear Filters -->
          <div class="flex items-end">
            <UButton 
              label="Clear Filters" 
              color="gray" 
              variant="outline"
              @click="clearUntitledFilters"
              :disabled="!untitledSelectedCity && !untitledSelectedVenue"
            />
          </div>
        </div>
      </div>
      
      <div v-if="untitledEventsLoading" class="text-center py-8">
        <div class="spinner mx-auto"></div>
        <p>Loading untitled events...</p>
      </div>
      
      <div v-else-if="untitledEvents.length === 0" class="text-center py-8">
        <p class="text-gray-600">No untitled events found.</p>
      </div>
      
      <div v-else-if="filteredUntitledEvents.length === 0 && (untitledSelectedCity || untitledSelectedVenue)" class="text-center py-8">
        <p class="text-gray-600">No untitled events found matching the selected filters.</p>
        <UButton 
          label="Clear Filters" 
          color="blue" 
          variant="outline"
          @click="clearUntitledFilters"
          class="mt-2"
        />
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="event in filteredUntitledEvents" :key="event.id" class="border rounded-lg p-4">
          <h3 class="font-semibold">{{ event.event_title }}</h3>
          <p class="text-sm text-gray-600">{{ event.listing?.venuename }}</p>
          <p class="text-sm text-gray-600">{{ event.city?.name }}</p>
          <p class="text-sm text-gray-500">{{ formatEventDate(event.event_start) }}</p>
          <div class="mt-2 flex gap-2">
            <UButton 
              label="Delete" 
              size="sm" 
              color="red"
              @click="openDeleteModal(event)"
            />
            <UButton 
              label="Edit" 
              size="sm" 
              color="amber"
              @click="editEvent(event)"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-semibold mb-2">Total Events</h3>
        <p class="text-3xl font-bold text-blue-600">{{ stats.totalEvents }}</p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-semibold mb-2">Total Venues</h3>
        <p class="text-3xl font-bold text-green-600">{{ stats.totalVenues }}</p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-semibold mb-2">Total Cities</h3>
        <p class="text-3xl font-bold text-purple-600">{{ stats.totalCities }}</p>
      </div>
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

<script setup lang="ts">
// Authentication
const { user, isAdmin, initializeAuth } = useAuth()

// Redirect if not admin
onMounted(async () => {
  await initializeAuth()
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/events')
  }
})

// Data
const selectedCity = ref(null)
const selectedVenue = ref([])
const cities = ref([])
const venues = ref([])
const categories = ref([])
const venueLoading = ref(false)
const isCreating = ref(false)
const progress = ref(0)
const createdCount = ref(0)
const eventCount = ref(null)

// Untitled events
const untitledEvents = ref([])
const untitledEventsLoading = ref(false)

// Filter state for untitled events
const untitledSelectedCity = ref(null)
const untitledSelectedVenue = ref(null)
const untitledCities = ref([])
const untitledVenues = ref([])
const untitledAllVenues = ref([])

// Modal state for untitled events
const isEditEventOpen = ref(false)
const isDeleteOpen = ref(false)
const content = ref({})

// Event count options (1-1000)
const eventCountOptions = ref(
  Array.from({ length: 1000 }, (_, i) => ({ label: i + 1, value: i + 1 }))
)

// Event template
const eventTemplate = ref({
  titlePrefix: 'Untitled',
  eventDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
  eventTime: '18:00', // Default to 6:00 PM
  photo: 'public/1731863970463',
  categoryId: 3,
  cost: '0',
  duration: '0'
})

// Stats
const stats = ref({
  totalEvents: 0,
  totalVenues: 0,
  totalCities: 0
})

const config = useRuntimeConfig()

// Search venues function
const searchVenues = async (q: string) => {
  venueLoading.value = true
  try {
    const response = await $fetch(`${config.public.baseURL}/api/venues/search/`, { 
      params: { q } 
    })
    
    // Add concatenated name for display
    response.forEach(venue => {
      venue.concatenatedName = `${venue.venuename} - ${venue.town}`
    })
    
    return response
  } catch (error) {
    console.error('Error searching venues:', error)
    return []
  } finally {
    venueLoading.value = false
  }
}

// Fetch untitled events
const fetchUntitledEvents = async () => {
  untitledEventsLoading.value = true
  try {
    const response = await $fetch(`${config.public.baseURL}/api/events/untitled`)
    untitledEvents.value = response || []
    
    // Extract cities and venues from the fetched events
    extractUntitledCities()
    extractUntitledVenues()
  } catch (error) {
    console.error('Error fetching untitled events:', error)
    untitledEvents.value = []
    // Still try to extract venues in case we have fallback data
    extractUntitledVenues()
  } finally {
    untitledEventsLoading.value = false
  }
}

// Format event date
const formatEventDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Edit event - open modal
const editEvent = (event: any) => {
  console.log("Opening edit modal for event:", event)
  isEditEventOpen.value = true
  content.value = event
}

// Delete event - open modal
const openDeleteModal = (event: any) => {
  console.log("Opening delete modal for event:", event)
  isDeleteOpen.value = true
  content.value = event
}

// Filtered untitled events based on selected filters
const filteredUntitledEvents = computed(() => {
  let filtered = untitledEvents.value

  if (untitledSelectedCity.value) {
    filtered = filtered.filter(event => event.cityId === untitledSelectedCity.value)
  }

  if (untitledSelectedVenue.value) {
    filtered = filtered.filter(event => event.listingId === untitledSelectedVenue.value)
  }

  return filtered
})

// Extract unique cities from untitled events
const extractUntitledCities = () => {
  const cityMap = new Map()
  untitledEvents.value.forEach(event => {
    if (event.city && !cityMap.has(event.city.id)) {
      cityMap.set(event.city.id, event.city)
    }
  })
  untitledCities.value = Array.from(cityMap.values())
}

// Extract unique venues from untitled events
const extractUntitledVenues = () => {
  const venueMap = new Map()
  untitledEvents.value.forEach(event => {
    if (event.listing && !venueMap.has(event.listing.id)) {
      venueMap.set(event.listing.id, event.listing)
    }
  })
  untitledAllVenues.value = Array.from(venueMap.values())
  untitledVenues.value = untitledAllVenues.value
  
  // If no venues from untitled events, use all venues as fallback
  if (untitledAllVenues.value.length === 0 && venues.value.length > 0) {
    untitledAllVenues.value = venues.value
    untitledVenues.value = venues.value
  }
}

// Filter venues by selected city
const filterUntitledVenuesByCity = () => {
  if (untitledSelectedCity.value) {
    untitledVenues.value = untitledAllVenues.value.filter(venue => venue.cityId === untitledSelectedCity.value)
    // Reset venue selection if current venue is not in filtered list
    if (untitledSelectedVenue.value && !untitledVenues.value.find(v => v.id === untitledSelectedVenue.value)) {
      untitledSelectedVenue.value = null
    }
  } else {
    untitledVenues.value = untitledAllVenues.value
  }
}

// Apply filters
const applyUntitledFilters = () => {
  // Filters are applied via computed property, no need for additional logic
}

// Clear all filters
const clearUntitledFilters = () => {
  untitledSelectedCity.value = null
  untitledSelectedVenue.value = null
  untitledVenues.value = untitledAllVenues.value
}

// Modal methods
const handleCloseModal = () => {
  isEditEventOpen.value = false
  isDeleteOpen.value = false
  toast.add({ title: 'Event updated!' })
  // Refresh untitled events after edit
  fetchUntitledEvents()
}

// Fetch initial data
const fetchInitialData = async () => {
  try {
    // Fetch cities
    const citiesResponse = await $fetch(`${config.public.baseURL}/api/cities`)
    cities.value = citiesResponse || []
    
    // Fetch venues
    const venuesResponse = await $fetch(`${config.public.baseURL}/api/venues`)
    venues.value = venuesResponse?.data || []
    
    // Fetch categories
    const categoriesResponse = await $fetch(`${config.public.baseURL}/api/categories`)
    categories.value = categoriesResponse || []
    
    // Fetch stats
    const eventsResponse = await $fetch(`${config.public.baseURL}/api/events`)
    stats.value.totalEvents = eventsResponse?.total || 0
    stats.value.totalVenues = venues.value.length
    stats.value.totalCities = cities.value.length
    
    // Fetch untitled events
    await fetchUntitledEvents()
  } catch (error) {
    console.error('Error fetching initial data:', error)
  }
}

// Create bulk events
const createBulkEvents = async () => {
  if (!selectedCity.value || !selectedVenue.value || !user.value?.id || !eventCount.value) {
    console.error('Missing required data for bulk creation')
    return
  }
  
  isCreating.value = true
  progress.value = 0
  createdCount.value = 0
  
  try {
    for (let i = 1; i <= eventCount.value; i++) {
      const venueId = selectedVenue.value?.id || selectedVenue.value?.[0]?.id;
      // Create datetime with default time 18:00
      const eventDateTime = new Date(eventTemplate.value.eventDate + 'T' + eventTemplate.value.eventTime + ':00')
      
      const eventData = {
        event_title: `${eventTemplate.value.titlePrefix} ${i}`,
        description: '',
        cost: eventTemplate.value.cost,
        duration: eventTemplate.value.duration,
        event_start: eventDateTime.toISOString(),
        photo: eventTemplate.value.photo,
        website: '',
        venue_id: venueId,
        listingId: venueId,
        cityId: parseInt(selectedCity.value),
        categoryId: parseInt(eventTemplate.value.categoryId),
        user_id: user.value.id,
        created_at: new Date().toISOString()
      }
      
      try {
        await $fetch(`${config.public.baseURL}/api/events/add`, {
          method: 'POST',
          body: eventData
        })
        createdCount.value++
      } catch (error) {
        console.error(`Error creating event ${i}:`, error)
      }
      
      // Update progress
      progress.value = (i / eventCount.value) * 100
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    // Refresh stats and untitled events
    await fetchInitialData()
    
    console.log('Bulk event creation completed!')
  } catch (error) {
    console.error('Error in bulk event creation:', error)
  } finally {
    isCreating.value = false
  }
}

// Watch for city changes to reset venue selection
watch(selectedCity, (newCityId) => {
  // Reset venue selection when city changes
  selectedVenue.value = []
})

// Watch for untitled city selection to filter venues
watch(untitledSelectedCity, () => {
  filterUntitledVenuesByCity()
})

// Initialize on mount
onMounted(async () => {
  await initializeAuth()
  await fetchInitialData()
})

// Redirect if not admin
watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/events')
  }
})
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
</style>
