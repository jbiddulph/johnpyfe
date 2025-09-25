// Custom Supabase composables - Temporary mock implementation
export const useSupabaseClient = () => {
  // Return a mock Supabase client
  return {
    auth: {
      onAuthStateChange: () => {},
      getUser: () => Promise.resolve({ data: { user: null } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      signInWithOAuth: () => Promise.resolve({ error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  }
}

export const useSupabaseUser = () => {
  // Return a mock user ref
  return ref(null)
}

export const useSupabaseSession = () => {
  // Return a mock session ref
  return ref(null)
}
