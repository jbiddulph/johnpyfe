<template>
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Email Confirmation</h1>
      <div v-if="loading" class="text-center">Confirming your email...</div>
      <div v-else-if="error" class="text-center text-red-500">{{ error }}</div>
      <div v-else class="text-center text-green-500">Your email has been confirmed successfully!</div>
      <div v-if="!loading && !error && !email">
        <input v-model="emailInput" type="email" placeholder="Enter your email" class="border p-2 mb-4 w-full" />
        <button @click="confirmEmail" class="bg-blue-500 text-white p-2 w-full">Confirm Email</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  
  const route = useRoute();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const loading = ref(true);
  const error = ref(null);
  const email = ref(route.query.email || '');
  const emailInput = ref(email.value);
  
  const confirmEmail = async () => {
    const token = route.query.token_hash;
    const emailToVerify = emailInput.value;
    if (!token || !emailToVerify) {
      error.value = 'Invalid token or email';
      loading.value = false;
      return;
    }
    
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: 'email',
        token,
        email: emailToVerify,
      });
      if (verifyError) throw verifyError;
      loading.value = false;
    } catch (err) {
      error.value = err.message;
      loading.value = false;
    }
  };
  
  onMounted(() => {
    if (email.value) {
      confirmEmail();
    } else {
      loading.value = false;
    }
  });
  </script>