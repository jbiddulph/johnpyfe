/** Authenticated $fetch wrapper using a fresh Supabase access token. */
export async function useAuthFetch<T>(
  url: string,
  options: Parameters<typeof $fetch<T>>[1] = {},
): Promise<T> {
  const { $supabase } = useNuxtApp()

  if (!$supabase?.auth) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in' })
  }

  async function resolveAccessToken(forceRefresh = false): Promise<string> {
    if (forceRefresh) {
      const { data, error } = await $supabase.auth.refreshSession()
      const token = data.session?.access_token
      if (error || !token) {
        try {
          await $supabase.auth.signOut()
        } catch {
          /* ignore */
        }
        throw createError({
          statusCode: 401,
          statusMessage: 'Your session expired. Please sign in again.',
        })
      }
      return token
    }

    const { data } = await $supabase.auth.getSession()
    const session = data.session
    if (!session?.access_token) {
      throw createError({ statusCode: 401, statusMessage: 'You must be logged in' })
    }

    // getSession() can return a cached expired JWT — refresh when near expiry
    const expiresAt = Number(session.expires_at || 0)
    const now = Math.floor(Date.now() / 1000)
    if (expiresAt > 0 && expiresAt - now < 90) {
      const { data: refreshed, error } = await $supabase.auth.refreshSession()
      if (!error && refreshed.session?.access_token) {
        return refreshed.session.access_token
      }
      // If refresh failed with an invalid refresh token, force re-login
      if (error) {
        try {
          await $supabase.auth.signOut()
        } catch {
          /* ignore */
        }
        throw createError({
          statusCode: 401,
          statusMessage: 'Your session expired. Please sign in again.',
        })
      }
    }

    return session.access_token
  }

  function withAuthHeaders(token: string) {
    return {
      ...options,
      headers: {
        ...(options.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      },
    }
  }

  const token = await resolveAccessToken()

  try {
    return await $fetch<T>(url, withAuthHeaders(token))
  } catch (err: any) {
    const status = err?.statusCode || err?.status || err?.response?.status
    if (status !== 401) throw err

    // Retry once with a forced refresh (covers expired access tokens)
    const freshToken = await resolveAccessToken(true)
    return await $fetch<T>(url, withAuthHeaders(freshToken))
  }
}
