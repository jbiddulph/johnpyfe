<template>
  <section class="bg-gray-50 dark:bg-gray-900">
    <div class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:min-h-screen lg:py-0">
      <div class="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
        <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
          <h1 class="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
            Create account
          </h1>

          <AuthEmailForm mode="register" />

          <AuthDivider />

          <AuthProviderButtons mode="register" />

          <p class="text-sm font-light text-gray-500 dark:text-gray-400 text-center">
            Already have an account?
            <NuxtLink
              :to="{ path: '/login', query: route.query }"
              class="font-medium text-primary-600 hover:underline dark:text-primary-500"
            >
              Sign in
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
const route = useRoute()

useSiteSeo({
  title: 'Create account',
  description: 'Create a UK Pubs account with email or Google.',
  path: '/register',
})
</script>
