import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then((response) => {
      const currentSession = response.data.session;
      setSession(currentSession);
      if (currentSession) {
        fetchProfile(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId) {
    console.log('🔍 Fetching profile for ID:', userId);
    setLoading(true);

    try {
      // Get fresh session to access email
      const sessionResponse = await supabase.auth.getSession();
      const currentSession = sessionResponse.data.session;
      const email = currentSession ? currentSession.user.email : null;

      console.log('📧 Session email:', email);

      if (!email) {
        console.error('❌ No email found in session!');
        setUserProfile({ id: userId, role: 'tenant', name: 'User' });
        setLoading(false);
        return;
      }

      // 1. Check ADMINS table
      const adminResponse = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .single();

      const adminData = adminResponse.data;
      const adminError = adminResponse.error;

      if (adminError && adminError.code !== 'PGRST116') {
        console.error('❌ Admin error:', adminError);
      }

      if (adminData) {
        if (adminData.frozen) {
          alert('❄️ Account Frozen!');
          await supabase.auth.signOut();
          return;
        }
        const role = adminData.is_supreme ? 'sa' : 'admin';
        console.log('✅ ADMIN detected. Role:', role);
        setUserProfile({ ...adminData, role });
        setLoading(false);
        return;
      }

      // 2. Check TENANTS table
      console.log('⚠️ Not admin. Checking tenant with email:', email);
      
      const tenantResponse = await supabase
        .from('tenants')
        .select('*')
        .eq('email', email)
        .single();

      const tenantData = tenantResponse.data;
      const tenantError = tenantResponse.error;

      if (tenantError && tenantError.code !== 'PGRST116') {
        console.error('❌ Tenant error:', tenantError);
      }

      if (tenantData) {
        console.log('✅ TENANT detected:', tenantData.name);
        setUserProfile({ ...tenantData, role: 'tenant', id: userId });
      } else {
        console.log('⚠️ No tenant record. Default user.');
        setUserProfile({ id: userId, role: 'tenant', name: 'User', email: email });
      }
    } catch (err) {
      console.error('💥 Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}