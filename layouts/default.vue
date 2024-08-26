<template>
  <div>
    <nav class="bg-white border-gray-200 dark:bg-gray-900">
      <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4 sticky">
        <NuxtLink to="/" class="h-12 flex items-center space-x-3 rtl:space-x-reverse">
            <img src="@/assets/logo.jpg" class="h-8" alt="LWFM Logo" />
            <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">LookWhatFound.me</span>
        </NuxtLink>
        <button @click="toggleMenu" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="navbar-default" aria-expanded="false">
            <span class="sr-only">Open main menu</span>
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
            </svg>
        </button>
        <div v-if="user">
          <p>Welcome, {{ user.email }}</p>
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
  </div>
</template>

<script lang="ts" setup>
import { useAuthStore } from "../store/auth.js";
import { onMounted, ref } from 'vue';
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const authStore = useAuthStore();
const loggedIn = ref(false);
const showMenu = ref(false);

const checkUserAuthentication = async () => {
  if (localStorage.getItem("userToken")) {
    // If user token exists, fetch user details
    await authStore.fetchUser();
  }
}

onMounted(() => {
  checkUserAuthentication(); // Check user authentication on page load
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


<style scoped>
.router-link-active {
  color: text-primary-700;
}
</style>