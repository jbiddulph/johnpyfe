import { requireVerifiedClaimAccess } from '../../../../utils/organisation-access'
import { requireAuth } from '../../../../utils/require-auth'
import { getSupabaseAdmin } from '../../../../utils/supabase-admin'
import { isVenueHeaderStoragePath, VENUE_HEADERS_BUCKET } from '../../../../utils/venue-profile'

/** Remove one header image from Supabase storage. */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const venueId = Number.parseInt(String(event.context.params?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  await requireVerifiedClaimAccess(user.id, venueId)

  const body = await readBody(event)
  const path = String(body?.path || '').trim()
  if (!path || !isVenueHeaderStoragePath(path, venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image path' })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(VENUE_HEADERS_BUCKET).remove([path])

  if (error) {
    console.error('[header-images.delete]', error)
    throw createError({ statusCode: 500, statusMessage: error.message || 'Delete failed' })
  }

  return { deleted: true, path }
})
