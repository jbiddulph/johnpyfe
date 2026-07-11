export default defineNuxtPlugin(() => {
  const router = useRouter()
  let started = false

  function startTracking() {
    if (started || !import.meta.client) return
    started = true

    const { trackPageView } = useAnalytics()
    trackPageView(router.currentRoute.value.fullPath.split('?')[0])

    router.afterEach((to) => {
      if (to.path.startsWith('/admin') || to.path.startsWith('/login') || to.path.startsWith('/register')) {
        return
      }
      trackPageView(to.fullPath.split('?')[0])
    })
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(startTracking, { timeout: 3000 })
  } else {
    setTimeout(startTracking, 1500)
  }
})
