import type { H3Event } from 'h3'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

/** Verify Supabase bearer token and return the authenticated user. */
export async function requireAuth(event: H3Event): Promise<User> {
  const config = useRuntimeConfig()
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
  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session' })
  }

  return data.user
}
