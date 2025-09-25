// Custom Supabase plugin to provide composables
import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  // Create Supabase client with fallback values
  const supabaseUrl = config.public.supabase?.url || process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = config.public.supabase?.key || process.env.SUPABASE_KEY || 'placeholder_key'
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Provide global composables
  return {
    provide: {
      supabase,
      // Provide the missing composables
      useSupabaseUser: () => {
        // Return a reactive user state
        const user = ref(null)
        
        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
          user.value = session?.user || null
        })
        
        // Get initial user
        supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
          user.value = currentUser
        })
        
        return user
      },
      useSupabaseClient: () => supabase,
      useSupabaseSession: () => {
        const session = ref(null)
        
        supabase.auth.onAuthStateChange((event, currentSession) => {
          session.value = currentSession
        })
        
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          session.value = currentSession
        })
        
        return session
      }
    }
  }
})
