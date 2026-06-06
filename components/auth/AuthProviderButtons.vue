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
type OAuthProvider = 'google' | 'facebook' | 'apple' | 'github'

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
  {
    id: 'facebook' as const,
    label: 'Continue with Facebook',
    className: 'auth-provider-btn--facebook',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>',
  },
  {
    id: 'apple' as const,
    label: 'Continue with Apple',
    className: 'auth-provider-btn--apple',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.467 2.223-1.177 3.08-.788.96-2.086 1.702-3.34 1.602-.158-1.1.415-2.265 1.12-3.08.83-.96 2.243-1.715 3.397-1.602zm2.08 15.07c-.735 1.68-1.08 2.437-2.02 3.915-1.31 2.08-3.156 4.68-5.44 4.7-1.02.01-1.71-.67-3.19-.67-1.48 0-1.96.67-3.18.68-2.28.02-4.01-2.25-5.32-4.32-2.91-4.62-3.22-10.04-1.42-12.92 1.27-2.02 3.28-3.21 5.16-3.21 1.96 0 3.19 1.01 4.81 1.01 1.58 0 2.54-1.01 4.8-1.01 1.84 0 3.79 1 5.05 2.72-4.44 2.42-3.72 8.73.77 10.42z"/></svg>',
  },
  {
    id: 'github' as const,
    label: 'Continue with GitHub',
    className: 'auth-provider-btn--github',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
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

.auth-provider-btn--facebook {
  @apply border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#166fe5];
}

.auth-provider-btn--apple {
  @apply border-gray-900 bg-gray-900 text-white hover:bg-black dark:border-gray-700;
}

.auth-provider-btn--github {
  @apply border-gray-800 bg-gray-800 text-white hover:bg-gray-900;
}
</style>
