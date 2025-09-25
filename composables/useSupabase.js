// Custom Supabase composables - Enhanced mock implementation
export const useSupabaseClient = () => {
  // Return a mock Supabase client
  return {
    auth: {
      onAuthStateChange: (callback) => {
        // Mock auth state change listener
        console.log('Auth state change listener registered');
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getUser: () => Promise.resolve({ data: { user: null } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      signInWithOAuth: async ({ provider, options }) => {
        console.log(`Mock ${provider} login initiated`);
        console.log('Redirect URL:', options?.redirectTo);
        
        // Simulate a successful OAuth flow
        if (typeof window !== 'undefined') {
          // In browser environment, simulate redirect
          setTimeout(() => {
            window.location.href = options?.redirectTo || '/auth/confirm';
          }, 1000);
        }
        
        return { error: null };
      },
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
  // Return a mock user ref with proper typing
  return ref({
    id: 'mock-user-id',
    email: 'mock@example.com',
    user_metadata: {
      name: 'Mock User'
    }
  })
}

export const useSupabaseSession = () => {
  // Return a mock session ref
  return ref(null)
}
