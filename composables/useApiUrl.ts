/** Absolute URL for server/client API calls (avoids broken relative fetches on Netlify SSR). */
export function useApiUrl(path: string) {
  const config = useRuntimeConfig()
  const base = (config.public.apiURL || config.public.appURL || config.public.baseURL || '')
    .toString()
    .replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

export function getRouteParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : String(param ?? '')
}
