<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div v-if="mode === 'register'">
      <label for="auth-name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
      <input
        id="auth-name"
        v-model="name"
        type="text"
        autocomplete="name"
        class="auth-input"
        placeholder="Your name"
      />
    </div>

    <div>
      <label for="auth-email" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
      <input
        id="auth-email"
        v-model="email"
        type="email"
        required
        autocomplete="email"
        class="auth-input"
        placeholder="you@example.com"
      />
    </div>

    <div>
      <label for="auth-password" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
      <input
        id="auth-password"
        v-model="password"
        type="password"
        required
        :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
        minlength="8"
        class="auth-input"
        placeholder="At least 8 characters"
      />
    </div>

    <div v-if="mode === 'register'">
      <label for="auth-password-confirm" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</label>
      <input
        id="auth-password-confirm"
        v-model="passwordConfirm"
        type="password"
        required
        autocomplete="new-password"
        minlength="8"
        class="auth-input"
        placeholder="Repeat your password"
      />
    </div>

    <UButton
      type="submit"
      color="lime"
      block
      :label="mode === 'register' ? 'Create account' : 'Sign in with email'"
      :loading="loading"
    />

    <p v-if="successMessage" class="text-sm text-emerald-700 dark:text-emerald-400">{{ successMessage }}</p>
    <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
  </form>
</template>

<script setup lang="ts">
type AuthMode = 'login' | 'register'

const props = defineProps<{
  mode: AuthMode
}>()

const route = useRoute()
const router = useRouter()
const { $supabase } = useNuxtApp()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function redirectPath(): string {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }
  return '/'
}

async function submit() {
  if (!import.meta.client) return

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (props.mode === 'register') {
      if (password.value !== passwordConfirm.value) {
        throw new Error('Passwords do not match')
      }

      const { data, error } = await $supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          data: {
            name: name.value.trim() || undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm?redirect=${encodeURIComponent(redirectPath())}`,
        },
      })

      if (error) throw error

      if (data.session) {
        await ensureUkpubsProfileClient()
        await router.push(redirectPath())
        return
      }

      successMessage.value = 'Check your email for a confirmation link, then sign in.'
      return
    }

    const { error } = await $supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })

    if (error) throw error

    await ensureUkpubsProfileClient()
    await router.push(redirectPath())
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Authentication failed'
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-lime-500 focus:border-lime-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white;
}
</style>
