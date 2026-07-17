<template>
  <div class="container mx-auto max-w-md p-4 py-12">
    <h1 class="text-2xl font-bold mb-4">Email confirmation</h1>
    <p v-if="loading" class="text-gray-600">Confirming your email…</p>
    <p v-else-if="error" class="text-red-600">{{ error }}</p>
    <p v-else-if="success" class="text-emerald-700">
      Your email has been confirmed. Redirecting…
    </p>
    <template v-else>
      <p class="text-gray-600 mb-4">Enter the email you registered with to complete confirmation.</p>
      <input
        v-model="emailInput"
        type="email"
        placeholder="you@example.com"
        class="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <UButton label="Confirm email" color="amber" block @click="confirmEmail" />
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { $supabase } = useNuxtApp()

const loading = ref(true)
const error = ref('')
const success = ref(false)
const emailInput = ref(String(route.query.email || ''))

function redirectPath(): string {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }
  return '/'
}

async function confirmEmail() {
  const token = String(route.query.token_hash || route.query.token || '')
  const email = emailInput.value.trim()

  if (!token || !email) {
    error.value = 'Invalid confirmation link or email'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    const otpType = String(route.query.type || 'email')
    const allowedTypes = new Set(['email', 'signup', 'recovery', 'invite'])
    const type = allowedTypes.has(otpType) ? otpType : 'email'

    const { error: verifyError } = await $supabase.auth.verifyOtp({
      type: type as 'email' | 'signup' | 'recovery' | 'invite',
      token_hash: token,
      email,
    })
    if (verifyError) throw verifyError

    await ensureUkpubsProfileClient()
    success.value = true
    setTimeout(() => {
      router.push(redirectPath())
    }, 1500)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Confirmation failed'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const { data: { user } } = await $supabase.auth.getUser()
  if (user) {
    await router.push(redirectPath())
    return
  }

  if (route.query.token_hash || route.query.token) {
    await confirmEmail()
  } else {
    loading.value = false
  }
})

useSiteSeo({
  title: 'Confirm email',
  description: 'Confirm your UK Pubs account email address.',
  path: '/auth/confirm',
})
</script>
