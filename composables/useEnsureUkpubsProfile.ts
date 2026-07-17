/** Ensure the signed-in user has a row in ukpubs_profiles (idempotent). */
export async function ensureUkpubsProfileClient() {
  if (!import.meta.client) return null
  try {
    return await useAuthFetch<{
      userId: string
      username: string
      displayName: string
    }>('/api/profiles/me')
  } catch (err) {
    console.warn('Could not sync UK Pubs profile', err)
    return null
  }
}
