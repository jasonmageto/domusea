import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const fetchUserProfile = useCallback(async (user) => {
    console.log('🔍 [AUTH] Fetching profile for:', user.email);
    setError(null);

    try {
      // ✅ CHECK 1: Supreme Admin by email
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
        setLoading(false);
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
          await supabase.auth.signOut();
          throw new Error('SUBSCRIPTION_FROZEN');
        }

        const profile = {
          id: admin.id,
          name: admin.name || user.email.split('@')[0],
          email: admin.email || user.email,
          role: 'admin', // ✅ CRITICAL: Must be 'admin' not 'supreme_admin'
          frozen: admin.frozen,
          subscription_status: admin.subscription_status,
          subscription_due: admin.subscription_due,
          subscription_fee: admin.subscription_fee,
          tenant_limit: admin.tenant_limit,
          admin_id: admin.id
        };
        
        console.log('🎯 [AUTH] Role assigned:', profile.role);
        setUserProfile(profile);
        setLoading(false);
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
        setLoading(false);
        return profile;
      }

      // ✅ CHECK 4: No profile found
      console.error('❌ [AUTH] No profile found');
      setUserProfile(null);
      setError(`No account found for ${user.email}`);
      setLoading(false);
      throw new Error('No account found');

    } catch (err) {
      console.error('❌ [AUTH] Error:', err);
      setUserProfile(null);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const handleAuthState = async (event, session) => {
      console.log('📡 [AUTH] State changed:', event);
      
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setError(null);
        setLoading(false);
      } else if (session?.user) {
        await fetchUserProfile(session.user);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthState);

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.user) {
          await fetchUserProfile(session.user);
        } else if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ [AUTH] Session error:', err);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (email, password) => {
    try {
      console.log('🔐 [AUTH] Login attempt for:', email);
      setError(null);
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!user) throw new Error('Login failed');

      await fetchUserProfile(user);
      return user;
      
    } catch (err) {
      console.error('❌ [AUTH] Login failed:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUserProfile(null);
      setError(null);
    } catch (err) {
      console.error('❌ [AUTH] Logout error:', err);
    }
  }, []);

  const value = {
    userProfile,
    loading,
    error,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};