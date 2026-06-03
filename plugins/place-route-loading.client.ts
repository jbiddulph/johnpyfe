import { isPlaceRoute } from '@/utils/place-routes'

export default defineNuxtPlugin((nuxtApp) => {
  const loading = useState('place-route-loading', () => false)
  const router = useRouter()

  function showForRoute(path: string) {
    if (isPlaceRoute(path)) {
      loading.value = true
    }
  }

  function hideSpinner() {
    loading.value = false
  }

  router.beforeEach((to, from) => {
    if (to.path !== from.path) {
      showForRoute(to.path)
    }
  })

  nuxtApp.hook('page:finish', () => {
    hideSpinner()
  })

  nuxtApp.hook('page:loading:end', () => {
    hideSpinner()
  })

  router.onError(() => {
    hideSpinner()
  })
})
