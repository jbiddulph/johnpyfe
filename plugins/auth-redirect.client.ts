/** After sign-in, leave auth pages for the homepage unless a safe redirect was requested. */
export default defineNuxtPlugin({
  name: 'auth-redirect',
  enforce: 'post',
  setup() {
    const nuxtApp = useNuxtApp()
    const supabase = nuxtApp.$supabase as { auth?: { onAuthStateChange: (cb: (event: string) => void) => void } } | undefined
    if (!supabase?.auth) return

    const router = useRouter()
    const route = useRoute()

    function postLoginPath(): string {
      const redirect = route.query.redirect
      if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
        return redirect
      }
      return '/'
    }

    supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' || !import.meta.client) return

      const path = route.path
      if (path === '/login' || path === '/register' || path.startsWith('/auth/')) {
        router.replace(postLoginPath())
      }
    })
  },
})
