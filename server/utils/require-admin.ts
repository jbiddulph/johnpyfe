import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

/** Verify Supabase bearer token belongs to the configured admin email. */
export async function requireAdmin(event: H3Event) {
  const config = useRuntimeConfig()
  const adminEmail = String(config.public.admin || '').trim().toLowerCase()
  if (!adminEmail) {
    throw createError({ statusCode: 503, statusMessage: 'Admin email is not configured' })
  }

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  const supabaseUrl = config.public.supabase?.url
  const supabaseKey = config.public.supabase?.key
  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 503, statusMessage: 'Supabase is not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.auth.getUser(token)
  const email = data.user?.email?.trim().toLowerCase()

  if (error || !email || email !== adminEmail) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  return data.user
}
