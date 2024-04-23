<template>
  <section class="bg-gray-50 dark:bg-gray-900">
    <div class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <a href="#" class="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
            <img class="w-8 h-8 mr-2" src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/logo.svg" alt="logo">
            johnPY    
        </a>
        <div class="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
            <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
                <h1 class="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                    Login
                </h1>
                
                <div class="mt-10">
                  <button class="bg-red-400 p-3 rounded text-white font-bold" @click="handleGoogleLogin">Login with Google</button>
                </div>
                <div class="space-y-4 md:space-y-6">
                    <div>
                        <label for="username" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your Username</label>
                        <input v-model="username" type="text" name="username" id="username" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="username" required="">
                    </div>
                    <div>
                        <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
                        <input v-model="password" type="password" name="password" id="password" placeholder="••••••••" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required="">
                    </div>
                    <!-- <div class="flex items-center justify-between">
                        <div class="flex items-start">
                            <div class="flex items-center h-5">
                              <input id="remember" aria-describedby="remember" type="checkbox" class="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800" required="">
                            </div>
                            <div class="ml-3 text-sm">
                              <label for="remember" class="text-gray-500 dark:text-gray-300">Remember me</label>
                            </div> 
                        </div>
                        <a href="#" class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500">Forgot password?</a>
                    </div> -->
                    <!-- <button @click="handleLogin" id="loginBtn" class="w-full text-blue-300 bg-blue-600  hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Login</button> -->
                    <p class="text-sm font-light text-gray-500 dark:text-gray-400">
                        Don’t have an account yet? <NuxtLink to="/register" class="font-medium text-primary-600 hover:underline dark:text-primary-500">Register</NuxtLink>
                    </p>
                </div>
            </div>
        </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { useAuthStore } from "@/store/auth.js";
const authStore = useAuthStore();
const username = ref("");
const password = ref("");
const supabase = useSupabaseClient()
const handleGoogleLogin = async () => {
  const {err} = supabase.auth.signInWithOAuth({
    provider: "google"
  })
  if(err) {
    console.log("there was an error logging in: ", err);
  }
}
// const handleLogin = async () => {
//   await authStore.login({  
//     username: username.value, 
//     password: password.value 
//   });
// };
</script>
