<template>
  <div>
    <nav class="bg-white border-gray-200 dark:bg-gray-900">
      <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4 sticky">
        <NuxtLink to="/" exact class="h-12 flex items-center space-x-3 rtl:space-x-reverse">
            <img src="/assets/2907054.png" class="h-8 w-8" alt="UK Pubs Logo" width="32" height="32" />
            <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">ukpubs.co.uk</span>
        </NuxtLink>
        <button @click="toggleMenu" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="navbar-default" aria-expanded="false">
            <span class="sr-only">Open main menu</span>
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
            </svg>
        </button>
        <div :class="{ 'hidden': !showMenu, 'block': showMenu }" class="w-full md:block md:w-auto" id="navbar-default">
          <ul class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            <li>
              <NuxtLink to="/" exact-active-class="router-link-exact-active" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent" aria-current="page">Home</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/map" exact-active-class="router-link-exact-active" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Map</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/venues" exact-active-class="router-link-exact-active" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:bg-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Venues</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/events" exact-active-class="router-link-exact-active" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:bg-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Events</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/login" exact-active-class="router-link-exact-active" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:bg-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Login</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/register" exact-active-class="router-link-exact-active" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 md:p-0 dark:text-white md:dark:hover:bg-primary-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Register</NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <main class="bg-primary-100 dark:bg-gray-800">
      <slot />
    </main>
    <footer>
      <div>
        <div class="container mx-auto">
          <ul>
            <li><NuxtLink to="/">Home</NuxtLink></li>
            <li></li>
          </ul>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth.js';

const authStore = useAuthStore();
const showMenu = ref(false);
const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};
</script>

<style>
body {
  font-family: 'Kanit', sans-serif;
}
.router-link-exact-active {
  @apply text-primary-700 !important;
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