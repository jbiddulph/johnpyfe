// Global authentication state composable
const user = ref(null);
const isInitialized = ref(false);

export const useAuth = () => {
  const { $supabase } = useNuxtApp();
  const config = useRuntimeConfig();

  // Initialize authentication state (only once)
  const initializeAuth = async () => {
    if (isInitialized.value) return;
    
    console.log('Initializing global auth state...');
    
    // Get initial session
    const { data: { session } } = await $supabase.auth.getSession();
    console.log('Initial session:', session?.user?.email);
    
    if (session?.user) {
      user.value = session.user;
    }

    // Listen for auth changes
    $supabase.auth.onAuthStateChange((event, session) => {
      console.log('Global auth state change:', event, session?.user?.email);
      if (session?.user) {
        user.value = session.user;
      } else {
        user.value = null;
      }
    });
    
    isInitialized.value = true;
  };

  // Check if user is admin
  const isAdmin = computed(() => {
    const isAdminUser = user.value?.email === config.public.admin;
    console.log('Global admin check:', {
      userEmail: user.value?.email,
      adminEmail: config.public.admin,
      isAdmin: isAdminUser
    });
    return isAdminUser;
  });

  // Check if user is logged in
  const isLoggedIn = computed(() => {
    return !!user.value;
  });

  return {
    user: readonly(user),
    isAdmin,
    isLoggedIn,
    initializeAuth
  };
};
