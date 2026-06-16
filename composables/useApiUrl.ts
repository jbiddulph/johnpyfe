/** Absolute URL for server/client API calls (avoids broken relative fetches on Netlify SSR). */
export function useApiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`

  // In the browser, always call the current site origin (avoids stale/wrong NUXT_PUBLIC_API_URL).
  if (import.meta.client && typeof window !== 'undefined') {
    return `${window.location.origin}${normalized}`
  }

  const config = useRuntimeConfig()
  const base = (config.public.apiURL || config.public.appURL || config.public.baseURL || '')
    .toString()
    .replace(/\/$/, '')
  return `${base}${normalized}`
}

export function getRouteParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : String(param ?? '')
}
