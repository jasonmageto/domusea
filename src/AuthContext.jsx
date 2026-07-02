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
  
  // ✅ FIX: Ref to prevent infinite auth loops
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // ✅ Helper: Safely parse localStorage with auto-clear on corruption
  const getStoredAuth = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('domusea-user');
      const storedToken = localStorage.getItem('domusea-token');
      
      if (!storedUser || !storedToken) return null;
      
      const parsedUser = JSON.parse(storedUser);
      
      // Validate required fields
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

  // ✅ Helper: Save auth state with timestamp for expiration checks
  const setStoredAuth = useCallback((user, token) => {
    try {
      localStorage.setItem('domusea-user', JSON.stringify(user));
      localStorage.setItem('domusea-token', token);
      localStorage.setItem('domusea-session-ts', Date.now().toString());
    } catch (err) {
      console.warn('⚠️ Failed to persist auth state:', err.message);
    }
  }, []);

  // ✅ Helper: Check if stored session is too old (24h threshold)
  const isSessionExpired = useCallback(() => {
    try {
      const ts = localStorage.getItem('domusea-session-ts');
      if (!ts) return true;
      
      const age = Date.now() - parseInt(ts, 10);
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
      return age > MAX_AGE;
    } catch {
      return true;
    }
  }, []);

  const fetchUserProfile = useCallback(async (user) => {
    // ✅ FIX: Prevent duplicate fetches
    if (isFetchingRef.current) {
      console.log('⏳ [AUTH] Fetch already in progress, skipping');
      return;
    }
    
    isFetchingRef.current = true;
    console.log('🔍 [AUTH] Fetching profile for:', user.email);
    setError(null);

    try {
      // ✅ CHECK 1: Supreme Admin by email (hardcoded allowlist)
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

      // ✅ CHECK 2: Property Admin
      console.log('🔍 [AUTH] Checking admins table...');
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (admin && !adminError) {
        console.log('✅ [AUTH] Property Admin found:', admin.name);
        
        if (admin.frozen === true || admin.subscription_status === 'Overdue') {
          console.log('🚫 [AUTH] Admin account frozen/overdue');
          const profile = {
            id: admin.id,
            name: admin.name || user.email.split('@')[0],
            email: admin.email || user.email,
            role: 'admin',
            frozen: true,
            subscription_status: admin.subscription_status,
            subscription_due: admin.subscription_due,
            subscription_fee: admin.subscription_fee,
            tenant_limit: admin.tenant_limit,
            admin_id: admin.id
          };
          setUserProfile(profile);
          setStoredAuth(profile, user.access_token);
          return profile;
        }

        const profile = {
          id: admin.id,
          name: admin.name || user.email.split('@')[0],
          email: admin.email || user.email,
          role: 'admin',
          frozen: false,
          subscription_status: admin.subscription_status,
          subscription_due: admin.subscription_due,
          subscription_fee: admin.subscription_fee,
          tenant_limit: admin.tenant_limit,
          admin_id: admin.id
        };
        
        console.log('🎯 [AUTH] Role assigned:', profile.role);
        setUserProfile(profile);
        setStoredAuth(profile, user.access_token);
        return profile;
      }

      // ✅ CHECK 3: Tenant
      console.log('🔍 [AUTH] Checking tenants table...');
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user.id)
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
        
        console.log('🎯 [AUTH] Role assigned:', profile.role);
        setUserProfile(profile);
        setStoredAuth(profile, user.access_token);
        return profile;
      }

      // ✅ CHECK 4: No profile found — clear storage and show error
      console.error('❌ [AUTH] No profile found for user:', user.email);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      setUserProfile(null);
      setError(`No account found for ${user.email}. Please contact support.`);
      throw new Error('NO_PROFILE_FOUND');

    } catch (err) {
      console.error('❌ [AUTH] Profile fetch error:', err);
      
      if (err.message === 'NO_PROFILE_FOUND' || err.message === 'SUBSCRIPTION_FROZEN') {
        // Let App.jsx handle these specific cases
      } else {
        localStorage.removeItem('domusea-user');
        localStorage.removeItem('domusea-token');
      }
      
      setUserProfile(null);
      setError(err.message);
      throw err;
    } finally {
      // ✅ FIX: Reset fetch flag and loading state
      isFetchingRef.current = false;
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        setLoading(false);
      }
    }
  }, [setStoredAuth]);

  useEffect(() => {
    // ✅ FIX: Only run initialization once
    if (hasInitializedRef.current) return;
    
    let mounted = true;

    const handleAuthState = async (event, session) => {
      // ✅ FIX: Prevent handling auth state while fetching
      if (isFetchingRef.current || !mounted) return;
      
      console.log('📡 [AUTH] State changed:', event);
      
      if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setError(null);
        localStorage.removeItem('domusea-user');
        localStorage.removeItem('domusea-token');
        localStorage.removeItem('domusea-session-ts');
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          setLoading(false);
        }
      } else if (session?.user && !userProfile) {
        // ✅ FIX: Only fetch if we don't already have a profile
        await fetchUserProfile(session.user);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthState);

    const checkSession = async () => {
      // ✅ FIX: Skip if already initialized or fetching
      if (hasInitializedRef.current || isFetchingRef.current) return;
      
      try {
        // ✅ First, try to restore from localStorage if Supabase session is stale
        const stored = getStoredAuth();
        
        if (stored && !isSessionExpired()) {
          console.log('♻️ [AUTH] Restoring from localStorage');
          setUserProfile(stored.user);
          hasInitializedRef.current = true;
          setLoading(false);
          return;
        }

        // ✅ Otherwise, verify with Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('⚠️ [AUTH] Session error:', sessionError.message);
          localStorage.removeItem('domusea-user');
          localStorage.removeItem('domusea-token');
          if (mounted) {
            hasInitializedRef.current = true;
            setLoading(false);
          }
          return;
        }
        
        if (mounted && session?.user && !userProfile) {
          await fetchUserProfile(session.user);
        } else if (mounted) {
          // No session — clear storage and finish loading
          localStorage.removeItem('domusea-user');
          localStorage.removeItem('domusea-token');
          hasInitializedRef.current = true;
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ [AUTH] Session check failed:', err);
        localStorage.removeItem('domusea-user');
        localStorage.removeItem('domusea-token');
        if (mounted) {
          setUserProfile(null);
          hasInitializedRef.current = true;
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile, getStoredAuth, isSessionExpired, userProfile]);

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
        console.error('❌ [AUTH] Auth error:', authError.message);
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
      await supabase.auth.signOut();
      setUserProfile(null);
      setError(null);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      localStorage.removeItem('domusea-session-ts');
      hasInitializedRef.current = false; // ✅ Allow re-initialization after logout
    } catch (err) {
      console.error('❌ [AUTH] Logout error:', err);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      setUserProfile(null);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    console.log('🔄 [AUTH] Forcing auth refresh');
    setLoading(true);
    setError(null);
    hasInitializedRef.current = false; // ✅ Allow re-fetch
    
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

  // ✅ CRITICAL: Memoize context value to prevent infinite re-renders
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