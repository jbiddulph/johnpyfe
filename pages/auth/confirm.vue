<template>
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Login</h1>
      <form @submit.prevent="login">
        <div class="mb-4">
          <label for="email" class="block text-gray-700">Email</label>
          <input type="email" id="email" v-model="email" class="mt-1 block w-full" required />
        </div>
        <div class="mb-4">
          <label for="password" class="block text-gray-700">Password</label>
          <input type="password" id="password" v-model="password" class="mt-1 block w-full" required />
        </div>
        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Login</button>
      </form>
    </div>
  </template>
  
  <script setup>
  // filepath: /Users/johnbiddulph/Documents/SITES/NUXT/thestreet/pages/login.vue
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  const supabase = useSupabaseClient();
  const email = ref('');
  const password = ref('');
  
  const login = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value });
      if (error) {
        if (error.message === 'Email not confirmed') {
          alert('Please confirm your email before logging in.');
        } else {
          throw error;
        }
      } else {
        router.push('/profile');
      }
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };
  </script>
  
  <style scoped>
  .container {
    max-width: 800px;
    margin: 0 auto;
  }
  </style>