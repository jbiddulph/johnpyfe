<template>
<div class="container mx-auto mt-8">
  {{ user }}
  <div v-if="user.name">
    <p>
      Welcome {{ user.name }}
    </p>
  </div>
  <div v-else>
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
