<template>
<div class="container mx-auto">
  <!-- {{ user }} -->
  <div v-if="loggedIn">
    <p>
      <!-- Welcome {{ user.username }} -->
    </p>
  </div>
</div>
<div class="header-img"><img src="/assets/images/filip-andrejevic-QmX5lw8StoQ-unsplash.jpg" alt=""></div>
<div class="container mx-auto">
  <div v-if="!loggedIn">
    You are currently not logged in
  </div>
</div>
</template>

<script lang="ts" setup>
import { useAuthStore } from "@/store/auth.js";
const authStore = useAuthStore();
const user = ref({});
const loggedIn = ref(false);

onMounted(async () => {
  authStore.fetchCsrfToken();
  try {
    user.value = authStore.user;
    loggedIn.value = true;
  } catch (error) {
    loggedIn.value = false;
  }
});

watch(authStore, (newValue: { user: any; }) => {
  if (newValue.user) {
    loggedIn.value = true;
    user.value = authStore.user;
  } else {
    loggedIn.value = false;
  }
});
</script>
