<template>
  <div class="space-y-3">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {{ mode === 'register' ? 'Sign up' : 'Sign in' }} with your preferred provider:
    </p>
    <div class="grid grid-cols-1 gap-3">
      <button
        v-for="provider in providers"
        :key="provider.id"
        type="button"
        class="auth-provider-btn"
        :class="provider.className"
        :disabled="loading === provider.id"
        @click="signInWith(provider.id)"
      >
        <span class="auth-provider-btn__icon" v-html="provider.icon" />
        <span>{{ provider.label }}</span>
      </button>
    </div>
    <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Additional providers must be enabled in your Supabase project under Authentication → Providers.
    </p>
  </div>
</template>

<script setup lang="ts">
type AuthMode = 'login' | 'register'
type OAuthProvider = 'google'

defineProps<{
  mode?: AuthMode
}>()

const { $supabase } = useNuxtApp()
const loading = ref<OAuthProvider | null>(null)
const errorMessage = ref('')

const providers = [
  {
    id: 'google' as const,
    label: 'Continue with Google',
    className: 'auth-provider-btn--google',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.6 3.5-5.1 3.5-3.1 0-5.6-2.5-5.6-5.6S8.9 6.1 12 6.1c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.7 14.6 2.8 12 2.8 7.4 2.8 3.7 6.5 3.7 11.1S7.4 19.4 12 19.4c4.3 0 7.1-3 7.1-7.3 0-.5 0-.9-.1-1.3H12z"/><path fill="#34A853" d="M3.7 7.3l3 2.3c.8-2.4 3-4.1 5.3-4.1 1.3 0 2.5.4 3.4 1.2l2.5-2.5C16.8 3.7 14.6 2.8 12 2.8 8.6 2.8 5.7 5 4.4 8l-.7-.7z"/><path fill="#FBBC05" d="M12 19.4c2.7 0 5-1 6.6-2.7l-3-2.3c-.8.6-1.9 1-3.6 1-2.8 0-5.1-1.9-5.9-4.4l-3 2.3C4.3 17.4 7.8 19.4 12 19.4z"/><path fill="#4285F4" d="M21.1 12.7c0-.5 0-.9-.1-1.3H12v3.6h5.1c-.2 1.1-.9 2.6-2.3 3.4l3 2.3c1.8-1.6 2.8-4 2.8-6z"/></svg>',
  },
]

async function signInWith(provider: OAuthProvider) {
  if (!import.meta.client) return
  loading.value = provider
  errorMessage.value = ''

  const { error } = await $supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  })

  loading.value = null
  if (error) {
    errorMessage.value = error.message
  }
}
</script>

<style scoped>
.auth-provider-btn {
  @apply flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition disabled:opacity-60;
}

.auth-provider-btn__icon :deep(svg) {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.auth-provider-btn--google {
  @apply border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800;
}
</style>
