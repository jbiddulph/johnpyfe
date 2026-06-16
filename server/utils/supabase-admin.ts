import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const config = useRuntimeConfig()
  const url = String(config.public.supabase?.url || '').trim()
  const key = String(config.supabaseServiceRoleKey || '').trim()

  if (!url || !key) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Image upload is not configured (SUPABASE_SERVICE_ROLE_KEY required)',
    })
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function venueHeadersPublicUrl(storagePath: string): string {
  const config = useRuntimeConfig()
  const base = String(config.public.supabase?.url || '').replace(/\/$/, '')
  const path = String(storagePath || '').replace(/^\/+/, '')
  return `${base}/storage/v1/object/public/venue_headers/${path}`
}
