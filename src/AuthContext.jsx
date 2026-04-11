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

      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .single();

      if (admin) {
        console.log('ADMIN detected. Role:', admin.role || 'admin', 'Frozen:', admin.frozen);

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

      if (user.email === 'sa@domusea.com' || user.email === 'supremeadmin@domusea.com' || user.email === '4mreaper@gmail.com') {
        console.log('SUPREME ADMIN detected');
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

      console.log('TENANT detected');
      setUserProfile({
        id: user.id,
        name: user.email.split('@')[0],
        email: user.email,
        role: 'tenant',
        frozen: false,
        admin_id: null
      });
      await checkTenantPasswordStatus(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!user) throw new Error('Login failed');

      await fetchUserProfile(user);
      return user;
    } catch (error) {
      console.error('Login error:', error);
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