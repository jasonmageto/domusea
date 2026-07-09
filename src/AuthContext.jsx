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
  
  // Refs to prevent infinite loops
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Helper: Safely parse localStorage
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
      console.warn(' Clearing corrupted auth storage:', err.message);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      localStorage.removeItem('domusea-session');
      return null;
    }
  }, []);

  // Helper: Save auth state
  const setStoredAuth = useCallback((user, token) => {
    try {
      localStorage.setItem('domusea-user', JSON.stringify(user));
      localStorage.setItem('domusea-token', token);
      localStorage.setItem('domusea-session-ts', Date.now().toString());
    } catch (err) {
      console.warn('⚠️ Failed to persist auth state:', err.message);
    }
  }, []);

  // Helper: Check session expiration (per Brief: access tied to device/browser)
  const isSessionExpired = useCallback(() => {
    try {
      const ts = localStorage.getItem('domusea-session-ts');
      if (!ts) return true;
      
      const age = Date.now() - parseInt(ts, 10);
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours for auth session
      return age > MAX_AGE;
    } catch {
      return true;
    }
  }, []);

  // Fetch user profile from database (per Brief: Users, Properties, Landlords entities)
  const fetchUserProfile = useCallback(async (user) => {
    if (isFetchingRef.current) {
      console.log('⏳ [AUTH] Fetch already in progress, skipping');
      return;
    }
    
    isFetchingRef.current = true;
    console.log('🔍 [AUTH] Fetching profile for:', user.email, '| Auth ID:', user.id);
    setError(null);

    try {
      // ✅ Check 1: Supreme Admin (hardcoded allowlist per Brief security)
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

      // ✅ Check 2: Property Admin (match by EMAIL for reliability)
      console.log('🔍 [AUTH] Checking admins table by email...');
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', user.email) // ✅ Match by email, not ID (more reliable)
        .maybeSingle();

      if (admin && !adminError) {
        console.log('✅ [AUTH] Property Admin found:', admin.name, '| Admin ID:', admin.id);
        
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

      // ✅ Check 3: Tenant (match by EMAIL for reliability)
      console.log(' [AUTH] Checking tenants table by email...');
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('email', user.email) // ✅ Match by email, not ID
        .maybeSingle();

      if (tenant && !tenantError) {
        console.log('✅ [AUTH] Tenant found:', tenant.name, '| Tenant ID:', tenant.id);

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

      // ✅ Check 4: Guest User (per Brief: guest preview allowed)
      // If no profile found, allow guest access for House Hunting only
      console.log('ℹ️ [AUTH] No profile found - allowing guest access for House Hunting');
      
      const guestProfile = {
        id: 'guest_' + user.id,
        email: user.email,
        role: 'guest',
        isGuest: true,
        name: user.email.split('@')[0]
      };
      
      setUserProfile(guestProfile);
      setStoredAuth(guestProfile, user.access_token);
      return guestProfile;

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
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        setLoading(false);
        console.log('✅ [AUTH] Initial loading complete');
      }
    }
  }, [setStoredAuth]);

  // Main auth effect - runs ONLY ONCE on mount
  useEffect(() => {
    if (hasInitializedRef.current) {
      console.log('✅ [AUTH] Already initialized, skipping');
      return;
    }
    
    let mounted = true;
    let authSubscription;

    const handleAuthState = async (event, session) => {
      if (!mounted || isFetchingRef.current) return;
      
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
        await fetchUserProfile(session.user);
      }
    };

    const checkSession = async () => {
      if (hasInitializedRef.current || isFetchingRef.current) return;
      
      try {
        const stored = getStoredAuth();
        
        if (stored && !isSessionExpired()) {
          console.log('♻️ [AUTH] Restoring from localStorage');
          setUserProfile(stored.user);
          hasInitializedRef.current = true;
          setLoading(false);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('️ [AUTH] Session error:', sessionError.message);
          localStorage.removeItem('domusea-user');
          localStorage.removeItem('domusea-token');
          if (mounted) {
            hasInitializedRef.current = true;
            setLoading(false);
          }
          return;
        }
        
        if (mounted && session?.user) {
          await fetchUserProfile(session.user);
        } else if (mounted) {
          // No session - allow guest access
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
    
    authSubscription = supabase.auth.onAuthStateChange(handleAuthState);

    return () => {
      console.log('🧹 [AUTH] Cleanup');
      mounted = false;
      if (authSubscription?.subscription) {
        authSubscription.subscription.unsubscribe();
      }
    };
  }, []); // ✅ EMPTY array - runs only once!

  // Login function (per Brief: secure authentication)
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

  // Logout function (per Brief: secure authentication)
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUserProfile(null);
      setError(null);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      localStorage.removeItem('domusea-session-ts');
      hasInitializedRef.current = false;
    } catch (err) {
      console.error('❌ [AUTH] Logout error:', err);
      localStorage.removeItem('domusea-user');
      localStorage.removeItem('domusea-token');
      setUserProfile(null);
    }
  }, []);

  // Refresh auth function
  const refreshAuth = useCallback(async () => {
    console.log('🔄 [AUTH] Forcing auth refresh');
    setLoading(true);
    setError(null);
    hasInitializedRef.current = false;
    
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

  // Memoize context value
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