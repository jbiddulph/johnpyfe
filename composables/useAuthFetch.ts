/** Authenticated $fetch wrapper using the current Supabase session token. */
export async function useAuthFetch<T>(
  url: string,
  options: Parameters<typeof $fetch<T>>[1] = {},
): Promise<T> {
  const { $supabase } = useNuxtApp()
  const { data } = await $supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in' })
  }

  return $fetch<T>(url, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  })
}
