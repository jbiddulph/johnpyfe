/** Shared Mapbox public token from runtime config / nuxt-mapbox module. */
export function useMapboxToken() {
  const config = useRuntimeConfig()
  return computed(() =>
    String(config.public.mapbox_token || config.mapbox?.accessToken || '').trim(),
  )
}
