export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { trackPageView } = useAnalytics()

  router.afterEach((to) => {
    if (to.path.startsWith('/admin') || to.path.startsWith('/login') || to.path.startsWith('/register')) {
      return
    }
    trackPageView(to.fullPath.split('?')[0])
  })
})
