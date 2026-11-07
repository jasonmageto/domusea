import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs to prevent race conditions
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const initPromiseRef = useRef(null); // ✅ Singleton init pattern

  const getStoredAuth = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('domusea-user');
      const storedToken = localStorage.getItem('domusea-token');
      
      if (!storedUser || !storedToken) return null;
      
      const parsedUser = JSON.parse(storedUser);
      
      if (!parsedUser?.id || !parsedUser?.role || !parsedUser?.email) {
        throw new Error('Invalid user structure');
      }
      
      return { user: parsedUser, token: storedToken };
    } catch (err) {
      console.warn('🔒 Clearing corrupted auth storage:', err.message);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      localStorage.removeItem('domusea-session');
      return null;
    }
  }, []);

  const setStoredAuth = useCallback((user, token) => {
    try {
      localStorage.setItem('domusea-user', JSON.stringify(user));
      localStorage.setItem('domusea-token', token);
      localStorage.setItem('domusea-session-ts', Date.now().toString());
    } catch (err) {
      console.warn('⚠️ Failed to persist auth state:', err.message);
    }
  }, []);

  const isSessionExpired = useCallback(() => {
    try {
      const ts = localStorage.getItem('domusea-session-ts');
      if (!ts) return true;
      
      const age = Date.now() - parseInt(ts, 10);
      const MAX_AGE = 24 * 60 * 60 * 1000;
      return age > MAX_AGE;
    } catch {
      return true;
    }
  }, []);

  const fetchUserProfile = useCallback(async (user) => {
    // ✅ Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('⏳ [AUTH] Fetch already in progress, skipping');
      return userProfile;
    }
    
    isFetchingRef.current = true;
    console.log('🔍 [AUTH] Fetching profile for:', user.email, '| Auth ID:', user.id);
    setError(null);

    try {
      // Check 1: Supreme Admin
      const supremeEmails = ['4mreaper@gmail.com', 'sa@domusea.com', 'supremeadmin@domusea.com'];
      if (supremeEmails.includes(user.email)) {
        console.log('✅ [AUTH] Supreme Admin detected');
        const profile = {
          id: user.id,
          name: 'Supreme Admin',
          email: user.email,
          role: 'supreme_admin',
          frozen: false,
          isSupremeAdmin: true
        };
        setUserProfile(profile);
        setStoredAuth(profile, user.access_token);
        return profile;
      }

      // Check 2: Property Admin (match by EMAIL)
      console.log('🔍 [AUTH] Checking admins table by email...');
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (admin && !adminError) {
        console.log('✅ [AUTH] Property Admin found:', admin.name);
        
        const profile = {
          id: admin.id,
          name: admin.name || user.email.split('@')[0],
          email: admin.email || user.email,
          role: 'admin',
          frozen: admin.frozen === true || admin.subscription_status === 'Overdue',
          subscription_status: admin.subscription_status,
          subscription_due: admin.subscription_due,
          subscription_fee: admin.subscription_fee,
          tenant_limit: admin.tenant_limit,
          admin_id: admin.id
        };
        
        console.log(' [AUTH] Role assigned:', profile.role);
        setUserProfile(profile);
        setStoredAuth(profile, user.access_token);
        return profile;
      }

      // Check 3: Tenant (match by EMAIL)
      console.log('🔍 [AUTH] Checking tenants table by email...');
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (tenant && !tenantError) {
        console.log('✅ [AUTH] Tenant found:', tenant.name);

        const profile = {
          id: tenant.id,
          name: tenant.name || user.email.split('@')[0],
          email: tenant.email || user.email,
          role: 'tenant',
          frozen: false,
          admin_id: tenant.admin_id,
          property: tenant.property,
          house: tenant.house,
          rent: tenant.rent,
          status: tenant.status
        };
        
        console.log(' [AUTH] Role assigned:', profile.role);
        setUserProfile(profile);
        setStoredAuth(profile, user.access_token);
        return profile;
      }

      // Check 4: No profile found - unknown role. Disallow guest access.
      console.log('⚠️ [AUTH] No profile found - unknown role for user:', user.email);

      // Clear any stored auth and force sign-out to prevent unknown-role access
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn('⚠️ [AUTH] Failed to sign out unknown-role user:', signOutErr?.message || signOutErr);
      }

      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      localStorage.removeItem('domusea-session-ts');

      // Surface a clear error so callers can handle it (login/init will catch this)
      const err = new Error('UNKNOWN_ROLE');
      setUserProfile(null);
      setError('Unknown role');
      throw err;

    } catch (err) {
      console.error('❌ [AUTH] Profile fetch error:', err);
      
      if (err.message !== 'NO_PROFILE_FOUND') {
        localStorage.removeItem('domusea-user');
        localStorage.removeItem('domusea-token');
      }
      
      setUserProfile(null);
      setError(err.message);
      throw err;
    } finally {
      isFetchingRef.current = false;
    }
  }, [setStoredAuth, userProfile]);

  // ✅ FIX: Singleton initialization to prevent race conditions
  const initializeAuth = useCallback(async () => {
    // If already initialized or initializing, return existing promise
    if (hasInitializedRef.current) {
      console.log('✅ [AUTH] Already initialized, skipping');
      return;
    }
    
    if (initPromiseRef.current) {
      console.log('⏳ [AUTH] Initialization in progress, waiting...');
      return initPromiseRef.current;
    }

    // Create a promise to track initialization
    initPromiseRef.current = (async () => {
      try {
        console.log('🚀 [AUTH] Starting initialization...');
        
        // 1️⃣ Try localStorage first (fast path)
        const stored = getStoredAuth();
        if (stored && !isSessionExpired()) {
          console.log('♻️ [AUTH] Restoring from localStorage');
          setUserProfile(stored.user);
          setLoading(false);
          hasInitializedRef.current = true;
          return;
        }

        // 2️⃣ Clear stale localStorage
        localStorage.removeItem('domusea-user');
        localStorage.removeItem('domusea-token');
        localStorage.removeItem('domusea-session-ts');

        // 3️⃣ Get session from Supabase
        console.log(' [AUTH] Fetching session from Supabase...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('⚠️ [AUTH] Session error:', sessionError.message);
          setLoading(false);
          hasInitializedRef.current = true;
          return;
        }
        
        if (session?.user) {
          console.log('👤 [AUTH] Session found, fetching profile...');
          await fetchUserProfile(session.user);
        }
        
      } catch (err) {
        console.error('❌ [AUTH] Init failed:', err);
        localStorage.removeItem('domusea-user');
        localStorage.removeItem('domusea-token');
        setUserProfile(null);
      } finally {
        setLoading(false);
        hasInitializedRef.current = true;
        initPromiseRef.current = null; // ✅ Reset promise ref
      }
    })();

    return initPromiseRef.current;
  }, [getStoredAuth, isSessionExpired, fetchUserProfile]);

  // Main auth effect - runs ONLY ONCE on mount
  useEffect(() => {
    let authSubscription;

    // ✅ Initialize auth (singleton pattern)
    initializeAuth();
    
    // ✅ Setup auth state listener
    authSubscription = supabase.auth.onAuthStateChange((event, session) => {
      console.log('📡 [AUTH] State changed:', event);
      
      if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setError(null);
        localStorage.removeItem('domusea-user');
        localStorage.removeItem('domusea-token');
        localStorage.removeItem('domusea-session-ts');
        hasInitializedRef.current = false;
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // ✅ Only fetch if we don't have a profile yet
        if (!userProfile) {
          fetchUserProfile(session.user);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // ✅ Update token but don't re-fetch profile
        if (userProfile) {
          setStoredAuth(userProfile, session.access_token);
        }
      }
    });

    return () => {
      console.log(' [AUTH] Cleanup');
      if (authSubscription?.subscription) {
        authSubscription.subscription.unsubscribe();
      }
      initPromiseRef.current = null;
    };
  }, []); // ✅ Empty array - runs only once!

  const login = useCallback(async (email, password) => {
    try {
      console.log('🔐 [AUTH] Login attempt for:', email);
      setError(null);
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error(' [AUTH] Auth error:', authError.message);
        throw authError;
      }
      if (!user) throw new Error('Login failed: no user returned');

      await fetchUserProfile(user);
      return user;
      
    } catch (err) {
      console.error('❌ [AUTH] Login failed:', err);
      setError(err.message);
      setLoading(false);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      throw err;
    }
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 [AUTH] Logout initiated');
      await supabase.auth.signOut();
      // State change handler will cleanup
    } catch (err) {
      console.error('❌ [AUTH] Logout error:', err);
      // Force cleanup even if Supabase fails
      setUserProfile(null);
      setError(null);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      localStorage.removeItem('domusea-session-ts');
      hasInitializedRef.current = false;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    console.log('🔄 [AUTH] Forcing auth refresh');
    setLoading(true);
    setError(null);
    hasInitializedRef.current = false;
    initPromiseRef.current = null;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUserProfile(null);
        localStorage.removeItem('domusea-user');
        localStorage.removeItem('domusea-token');
      }
    } catch (err) {
      console.error('❌ [AUTH] Refresh failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  const value = useMemo(() => ({
    userProfile,
    loading,
    error,
    login,
    logout,
    refreshAuth
  }), [userProfile, loading, error, login, logout, refreshAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};