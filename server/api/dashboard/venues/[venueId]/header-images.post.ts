import { requireVerifiedClaimAccess } from '../../../../utils/organisation-access'
import { requireAuth } from '../../../../utils/require-auth'
import { getSupabaseAdmin, venueHeadersPublicUrl } from '../../../../utils/supabase-admin'
import { MAX_VENUE_HEADER_IMAGES, VENUE_HEADERS_BUCKET } from '../../../../utils/venue-profile'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 10 * 1024 * 1024

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/webp': return 'webp'
    case 'image/gif': return 'gif'
    default: return 'jpg'
  }
}

/** Upload one header image to Supabase storage (venue_headers bucket). */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const venueId = Number.parseInt(String(event.context.params?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  await requireVerifiedClaimAccess(user.id, venueId)

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const filePart = form.find((part) => part.name === 'file' && part.data?.length)
  if (!filePart?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file field' })
  }

  const mime = String(filePart.type || '').toLowerCase()
  if (!ALLOWED_TYPES.has(mime)) {
    throw createError({ statusCode: 412, statusMessage: 'Image must be JPEG, PNG, WebP, or GIF' })
  }

  if (filePart.data.length > MAX_BYTES) {
    throw createError({ statusCode: 412, statusMessage: 'Image must be smaller than 10MB' })
  }

  const ext = extensionForMime(mime)
  const objectPath = `${venueId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.storage
    .from(VENUE_HEADERS_BUCKET)
    .upload(objectPath, filePart.data, {
      contentType: mime,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('[header-images.upload]', error)
    throw createError({ statusCode: 500, statusMessage: error.message || 'Upload failed' })
  }

  return {
    path: objectPath,
    url: venueHeadersPublicUrl(objectPath),
    maxImages: MAX_VENUE_HEADER_IMAGES,
  }
})
