<template>
  <div>
    <nav class="bg-white border-gray-200 dark:bg-gray-900">
      <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4 sticky">
        <NuxtLink to="/" class="h-12 flex items-center space-x-3 rtl:space-x-reverse">
            <img src="@/assets/2907054.png" class="h-8 w-10" alt="UK Pubs Logo" />
            <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">UKPubs.co.uk</span>
        </NuxtLink>
        <button @click="toggleMenu" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="navbar-default" aria-expanded="false">
            <span class="sr-only">Open main menu</span>
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
            </svg>
        </button>
        <div v-if="user">
          <p>Welcome, {{ user.user_metadata.name }}</p>
        </div>
        <!-- <div v-if="authStore.user">
          Welcome {{ authStore.user.username }}, you are logged in
        </div> -->
        <div :class="{ 'hidden': !showMenu, 'block': showMenu }" class="w-full md:block md:w-auto" id="navbar-default">
          <!-- <ul v-if="loggedIn" class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700"> -->
            <ul v-if="user" class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
              <li>
                <NuxtLink @click="toggleMenu" to="/" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent" aria-current="page">Home</NuxtLink>
              </li>
              <li>
                <NuxtLink @click="toggleMenu" to="/map" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Map</NuxtLink>
              </li>
              <!-- <li>
                <NuxtLink @click="toggleMenu" to="/map/map" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Map</NuxtLink>
              </li> -->
              <li>
                <NuxtLink @click="toggleMenu" to="/venues" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Venues</NuxtLink>
              </li>
              <li>
                <NuxtLink @click="toggleMenu" to="/events" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Events</NuxtLink>
              </li>
              <li>
                <a @click="logout" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent cursor-pointer">Logout</a>
              </li>
            </ul>

          <!-- <ul v-else-if="!loggedIn" class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700"> -->
            <ul v-else-if="!user" class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            <li>
              <NuxtLink @click="toggleMenu" to="/" class="block py-2 px-3 text-white bg-primary-700 rounded md:bg-transparent md:text-primary-700 md:p-0 dark:text-white md:dark:text-primary-500" aria-current="page">Home</NuxtLink>
            </li>
            <li>
              <NuxtLink @click="toggleMenu" to="/login" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Login</NuxtLink>
            </li>
            <li>
              <NuxtLink @click="toggleMenu" to="/events" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Events</NuxtLink>
            </li>
            <li>
              <NuxtLink @click="toggleMenu" to="/venues" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Venues</NuxtLink>
            </li>
            <!-- <li>
              <NuxtLink @click="toggleMenu" to="/register" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Register</NuxtLink>
            </li> -->
          </ul>
        </div>
      </div>
    </nav>
    <nav class="bg-white border-gray-200 dark:bg-gray-900">
      <!-- Show the menu items -->
      <div :class="{ 'hidden': !showMenu, 'block': showMenu }" class="w-full md:block md:w-auto" id="navbar-default">
        <!-- Your menu items here -->
      </div>
    </nav>
    <main class="bg-primary-100 dark:bg-gray-800">
      <!-- <Nuxt /> -->
      <slot />
    </main>
    <footer>
      <div class="bg-gray-800 text-white">
        <div class="container mx-auto py-12">
          <ul>
            <li><NuxtLink to="/">Home</NuxtLink></li>
            <li></li>
          </ul>
          <p>
            <i><NuxtLink to="/">ukpubs.co.uk</NuxtLink></i> is an events listings website for pubs and venues  around the UK
          </p>
          <p>More events at the following venues</p>
          <div v-if="eventsFetched" class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <!-- Venue Section -->
            <div>
              <h3 class="text-2xl">Pubs / Venues</h3>
              <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <li v-for="event in eventStore.venues" :key="event.venueId">
                  <NuxtLink :to="`/venues/${event.venueId}/${event.slug}`">{{ event.venueName }} ({{ event.count }})</NuxtLink>
                </li>
              </ul>
            </div>

            <!-- Town Section -->
            <div>
              <h3 class="text-2xl">Towns</h3>
              <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <li v-for="town in eventStore.towns" :key="town.town">
                  {{ town.town }} ({{ town.eventCount }})
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { useAuthStore } from "~/store/auth.js";
import { useEventStore } from '~/store/event.js';
useSeoMeta({
  title: 'Pubs and venues around the UK',
  description: 'Events listings website for pubs and venues around the UK',
  og: {
    title: 'Pubs and bars in and around the UK',
    description: 'Live music, comedy, gigs, quizzes and other events at your local pub',
  },
})

// Use `useHead` for more control, such as custom meta tags or other head elements
useHead({
  title: 'My App',
  meta: [
    { name: 'description', content: 'Pub listings UK, events at venues and bars in the uk' },
    { name: 'robots', content: 'index, follow' },
    { name: 'author', content: 'John Biddulph - UK Pubs' },
    { property: 'og:image', content: '/favicon-96x96.png' },  // Example of custom meta tag
  ],
})
const eventStore = useEventStore();
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const authStore = useAuthStore();
const loggedIn = ref(false);
const showMenu = ref(false);
const eventsFetched = ref(false);

const checkUserAuthentication = async () => {
  if (localStorage.getItem("userToken")) {
    // If user token exists, fetch user details
    await authStore.fetchUser();
  }
}

onMounted(async () => {
  console.log('onMounted called');
  checkUserAuthentication(); // Check user authentication on page load
  if (eventStore.events.length === 0 && !eventsFetched.value) {
    console.log('Fetching events');
    eventsFetched.value = true; // Set the flag to true to prevent recursive updates
    await eventStore.fetchAllEventsTopten();
    console.log('Events fetched');
  }
});

const logout = async () => {
  // logout from Google 
  const { error } = supabase.auth.signOut()
  if (error){
    console.log("Error: ", error)
  }
  //logout JWT
  toggleMenu()
  await authStore.logoutUser();
  navigateTo("/")
} 

const toggleMenu = () => {
  showMenu.value = !showMenu.value; // Toggle the visibility of the menu
}

watch(authStore, (newValue: { user: any; }) => {
  if (newValue && newValue.user) {
    loggedIn.value = true;
  } else {
    loggedIn.value = false;
  }
});
</script>


<style>
body {
  font-family: 'Kanit', sans-serif;
}
h1 {
  font-weight: 100;
}
.router-link-active {
  @apply text-primary-500 !important;
}
@media (min-width: 768px) {
    :is(.dark .md\:dark\:text-white) {
  }
}
@media (min-width: 768px) {
  :is(.dark .md\:dark\:text-white) {
    color: white !important;
  }
}
</style>