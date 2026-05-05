import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkTenantPasswordStatus = async (user) => {
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
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    checkSession();

    return () => subscription?.unsubscribe();
  }, []);

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserProfile(user) {
    try {
      console.log('Fetching profile for ID:', user.id);

      // 🔥 CHECK 1: Supreme Admin by email (MUST BE FIRST!)
      if (user.email === '4mreaper@gmail.com' || 
          user.email === 'sa@domusea.com' || 
          user.email === 'supremeadmin@domusea.com') {
        console.log('✅ SUPREME ADMIN detected by email');
        setUserProfile({
          id: user.id,
          name: 'Supreme Admin',
          email: user.email,
          role: 'sa',
          frozen: false
        });
        await checkTenantPasswordStatus(user);
        return;
      }

      // CHECK 2: Regular Property Admin (from admins table)
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .single();

      if (admin) {
        console.log('ADMIN detected. Role: admin Frozen:', admin.frozen);
        
        // Check if admin is frozen
        if (admin.frozen === true) {
          await supabase.auth.signOut();
          throw new Error('SUBSCRIPTION_FROZEN');
        }

        setUserProfile({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role || 'admin',
          frozen: admin.frozen,
          subscription_status: admin.subscription_status,
          subscription_due: admin.subscription_due,
          admin_id: admin.id
        });
        await checkTenantPasswordStatus(user);
        return;
      }

      // CHECK 3: Tenant - WITH ADMIN FROZEN CHECK
      console.log('Checking TENANT status...');
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          *,
          admins (
            id,
            frozen,
            subscription_status,
            name
          )
        `)
        .eq('id', user.id)
        .single();

      if (tenant) {
        console.log('TENANT detected. Admin frozen:', tenant.admins?.frozen);

        // 🔥 CRITICAL CHECK: If tenant's admin is frozen, block access
        if (tenant.admins?.frozen === true) {
          console.log('Blocking tenant login - admin is frozen');
          await supabase.auth.signOut();
          throw new Error('ACCOUNT_FROZEN_BY_ADMIN');
        }

        setUserProfile({
          id: tenant.id,
          name: tenant.name || user.email.split('@')[0],
          email: tenant.email || user.email,
          role: 'tenant',
          frozen: false,
          admin_id: tenant.admin_id,
          property: tenant.property,
          house: tenant.house,
          rent: tenant.rent
        });
        await checkTenantPasswordStatus(user);
        return;
      }

      // CHECK 4: No profile found
      console.log('No profile found for user:', user.id);
      await supabase.auth.signOut();
      throw new Error('No account found. Please contact support.');

    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
      throw error; // Re-throw so Login component can handle it
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      console.log('Login attempt for:', email);
      
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }
      
      if (!user) {
        throw new Error('Login failed - no user returned');
      }

      // Fetch profile will handle frozen checks and throw errors if needed
      await fetchUserProfile(user);
      
      console.log('Login successful for:', user.email);
      return user;
      
    } catch (error) {
      console.error('Login error:', error);
      // Don't sign out here - let the error propagate to Login component
      throw error;
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  const value = {
    userProfile,
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};