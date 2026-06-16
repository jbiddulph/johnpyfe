import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin({
  name: 'supabase',
  setup() {
    const config = useRuntimeConfig()

    const supabaseUrl = config.public.supabase.url
    const supabaseKey = config.public.supabase.key

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase URL or Key not found in runtime config')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    return {
      provide: {
        supabase,
      },
    }
  },
})
