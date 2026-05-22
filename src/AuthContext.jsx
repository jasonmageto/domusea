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

  const checkTenantPasswordStatus = useCallback(async (user) => {
    if (user?.user_metadata?.role === 'tenant') {
      try {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('password_changed')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking password status:', error);
          return;
        }

        if (tenant && !tenant.password_changed) {
          window.location.href = '/#change-password?first_login=true';
        }
      } catch (error) {
        console.error('Error checking password status:', error);
      }
    }
  }, []);

  const fetchUserProfile = useCallback(async (user) => {
    console.log('🔍 [AUTH] Fetching profile for:', user.email, user.id);
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
      let { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!admin && !adminError) {
        const emailResult = await supabase
          .from('admins')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        admin = emailResult.data;
        adminError = emailResult.error;
      }

      if (admin && !adminError) {
        console.log('✅ [AUTH] Admin found:', admin.name);
        
        if (admin.frozen === true || admin.subscription_status === 'Overdue') {
          console.log('🚫 [AUTH] Admin account frozen/overdue');
          await supabase.auth.signOut();
          throw new Error('SUBSCRIPTION_FROZEN');
        }

        const profile = {
          id: admin.id,
          name: admin.name || user.email.split('@')[0],
          email: admin.email || user.email,
          role: 'admin',
          frozen: admin.frozen,
          subscription_status: admin.subscription_status,
          subscription_due: admin.subscription_due,
          subscription_fee: admin.subscription_fee,
          tenant_limit: admin.tenant_limit,
          admin_id: admin.id
        };
        
        setUserProfile(profile);
        setLoading(false);
        await checkTenantPasswordStatus(user);
        return profile;
      }

      // ✅ CHECK 3: Tenant - SIMPLIFIED QUERY (No complex joins initially)
      console.log('🔍 [AUTH] Checking tenants table for ID:', user.id);
      
      // First try: Simple query by ID without joins
      let { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')  // Simple select first
        .eq('id', user.id)
        .maybeSingle();

      console.log('[AUTH] Tenant query by ID result:', { 
        found: !!tenant, 
        error: tenantError?.message,
        hasData: !!tenant 
      });

      // If not found by ID, try by email
      if (!tenant && !tenantError) {
        console.log('⚠️ [AUTH] Tenant not found by ID, trying email:', user.email);
        const emailResult = await supabase
          .from('tenants')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        tenant = emailResult.data;
        tenantError = emailResult.error;
        
        console.log('[AUTH] Tenant query by email result:', { 
          found: !!tenant, 
          error: tenantError?.message 
        });
      }

      if (tenant && !tenantError) {
        console.log('✅ [AUTH] Tenant found:', tenant.name);
        
        // Now check admin status separately (avoid complex joins)
        let adminFrozen = false;
        let adminSubscriptionStatus = null;
        
        if (tenant.admin_id) {
          try {
            const { data: adminData } = await supabase
              .from('admins')
              .select('frozen, subscription_status')
              .eq('id', tenant.admin_id)
              .maybeSingle();
            
            adminFrozen = adminData?.frozen || false;
            adminSubscriptionStatus = adminData?.subscription_status;
            
            console.log('[AUTH] Admin status check:', { 
              adminFrozen, 
              adminSubscriptionStatus 
            });
          } catch (adminErr) {
            console.warn('[AUTH] Could not check admin status:', adminErr);
          }
        }

        if (adminFrozen || adminSubscriptionStatus === 'Overdue') {
          console.log('🚫 [AUTH] Tenant blocked - admin frozen/overdue');
          await supabase.auth.signOut();
          throw new Error('ACCOUNT_FROZEN_BY_ADMIN');
        }

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
        
        console.log('✅ [AUTH] Setting tenant profile');
        setUserProfile(profile);
        setLoading(false);
        await checkTenantPasswordStatus(user);
        return profile;
      }

      // ✅ CHECK 4: No profile found
      console.error('❌ [AUTH] No profile found in any table');
      console.log('User ID:', user.id);
      console.log('User Email:', user.email);
      console.log('Admin error:', adminError?.message);
      console.log('Tenant error:', tenantError?.message);
      
      setUserProfile(null);
      setError(`No account found for ${user.email}. Please contact support.`);
      setLoading(false);
      
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 2000);
      
      throw new Error(`No account found. User exists in Auth but not in database.`);

    } catch (err) {
      console.error('❌ [AUTH] Error in fetchUserProfile:', err);
      setUserProfile(null);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [checkTenantPasswordStatus]);

  useEffect(() => {
    let mounted = true;

    const handleAuthState = async (event, session) => {
      console.log('📡 [AUTH] State changed:', event, session?.user?.email);
      
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
      console.log('🔄 [AUTH] Checking initial session...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [AUTH] Session error:', sessionError);
          if (mounted) setLoading(false);
          return;
        }

        if (mounted && session?.user) {
          console.log('✅ [AUTH] Found session:', session.user.email);
          await fetchUserProfile(session.user);
        } else {
          console.log('ℹ️ [AUTH] No session');
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error('❌ [AUTH] Session check error:', err);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    return () => {
      console.log('🧹 [AUTH] Cleaning up');
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

      if (authError) {
        console.error('❌ [AUTH] Auth error:', authError);
        
        if (authError.message?.includes('Invalid login credentials') || authError.status === 400) {
          throw new Error('Invalid email or password');
        }
        if (authError.message?.includes('Email not confirmed')) {
          throw new Error('Please confirm your email address');
        }
        
        throw authError;
      }
      
      if (!user) {
        throw new Error('Login failed - no user returned');
      }

      console.log('✅ [AUTH] Auth successful, fetching profile...');
      await fetchUserProfile(user);
      console.log('✅ [AUTH] Login complete');
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
      console.log('👋 [AUTH] Logging out');
      await supabase.auth.signOut();
      setUserProfile(null);
      setError(null);
    } catch (err) {
      console.error('❌ [AUTH] Logout error:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    console.log('🔄 [AUTH] Refreshing profile');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user);
    }
  }, [fetchUserProfile]);

  const value = {
    userProfile,
    loading,
    error,
    login,
    logout,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};