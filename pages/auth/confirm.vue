<template>
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Email Confirmation</h1>
      <div v-if="loading" class="text-center">Confirming your email...</div>
      <div v-else-if="error" class="text-center text-red-500">{{ error }}</div>
      <div v-else class="text-center text-green-500">Your email has been confirmed successfully!</div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useSupabaseClient } from '@supabase/supabase-js';
  
  const route = useRoute();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const loading = ref(true);
  const error = ref(null);
  
  const confirmEmail = async () => {
    const token = route.query.token_hash;
    const email = route.query.email;
    if (!token || !email) {
      error.value = 'Invalid token or email';
      loading.value = false;
      return;
    }
    
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: 'email',
        token,
        email,
      });
      if (verifyError) throw verifyError;
      loading.value = false;
    } catch (err) {
      error.value = err.message;
      loading.value = false;
    }
  };
  
  onMounted(() => {
    confirmEmail();
  });
  </script>