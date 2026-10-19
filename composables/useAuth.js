// Global authentication state composable
import { ensureUkpubsProfileClient } from './useEnsureUkpubsProfile'

const user = ref(null);
const isInitialized = ref(false);
let profileSyncInFlight = null;

export const useAuth = () => {
  const { $supabase } = useNuxtApp();
  const config = useRuntimeConfig();

  const syncUkpubsProfile = async () => {
    if (!import.meta.client || !user.value) return;
    if (profileSyncInFlight) return profileSyncInFlight;

    profileSyncInFlight = (async () => {
      try {
        await ensureUkpubsProfileClient();
      } finally {
        profileSyncInFlight = null;
      }
    })();

    return profileSyncInFlight;
  };

  // Initialize authentication state (only once on the client)
  const initializeAuth = async () => {
    if (isInitialized.value) return;

    // Supabase is a client plugin — never mark initialized without it,
    // or a premature call would leave guests unable to detect a real session.
    if (!$supabase?.auth) {
      if (import.meta.server) return;
      console.warn('Supabase auth unavailable; skipping auth init');
      isInitialized.value = true;
      return;
    }
    
    console.log('Initializing global auth state...');
    
    // Get initial session
    const { data: { session } } = await $supabase.auth.getSession();
    console.log('Initial session:', session?.user?.email);
    
    if (session?.user) {
      user.value = session.user;
      void syncUkpubsProfile();
    } else {
      user.value = null;
    }

    // Listen for auth changes
    $supabase.auth.onAuthStateChange((event, session) => {
      console.log('Global auth state change:', event, session?.user?.email);
      if (session?.user) {
        user.value = session.user;
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          void syncUkpubsProfile();
        }
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
    initializeAuth,
    syncUkpubsProfile,
  };
};
