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
        console.log('Original redirect URL:', options?.redirectTo);
        
        // Simulate a successful OAuth flow
        if (typeof window !== 'undefined') {
          // Set the mock user as logged in
          mockUser = {
            id: 'mock-user-id',
            email: 'john.mbiddulph@gmail.com',
            user_metadata: {
              name: 'John Biddulph'
            }
          };
          
          // In browser environment, simulate redirect to main site instead of /auth/confirm
          setTimeout(() => {
            // Extract the final redirect destination from the redirectTo URL
            const finalRedirect = options?.redirectTo?.includes('redirect=') 
              ? new URLSearchParams(options.redirectTo.split('?')[1]).get('redirect') || '/'
              : '/';
            
            console.log('Redirecting to:', finalRedirect);
            window.location.href = finalRedirect;
          }, 1000);
        }
        
        return { error: null };
      },
      signOut: () => {
        // Clear the mock user
        mockUser = null;
        console.log('Mock user logged out');
        return Promise.resolve({ error: null });
      }
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  }
}

// Global user state for mock authentication
let mockUser = null;

export const useSupabaseUser = () => {
  // Return a mock user ref that starts as null (not logged in)
  const user = ref(mockUser);
  
  // Watch for changes to the global mock user
  watch(() => mockUser, (newUser) => {
    user.value = newUser;
  }, { immediate: true });
  
  return user;
}

export const useSupabaseSession = () => {
  // Return a mock session ref
  return ref(null)
}
