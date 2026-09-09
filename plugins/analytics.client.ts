export default defineNuxtPlugin(() => {
  const router = useRouter()
  const config = useRuntimeConfig()
  let started = false

  function loadGtag() {
    const id = String(config.public.googleAnalyticsId || '').trim()
    const win = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
    if (!id || win.gtag) return

    win.dataLayer = win.dataLayer || []
    win.gtag = function gtag(...args: unknown[]) {
      win.dataLayer?.push(args)
    }
    win.gtag('js', new Date())
    win.gtag('config', id)

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(script)
  }

  function startTracking() {
    if (started || !import.meta.client) return
    started = true
    loadGtag()

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
    requestIdleCallback(startTracking, { timeout: 3500 })
  } else {
    setTimeout(startTracking, 1500)
  }
})
