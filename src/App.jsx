import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Existing Components
import SADashboard from './components/SADashboard';
import ManageAdmins from './components/ManageAdmins';
import PropertyAdminDashboard from './components/PropertyAdminDashboard';
import ManageTenants from './components/ManageTenants';
import OccupancyGrid from './components/OccupancyGrid';
import AdminPaymentMethods from './components/AdminPaymentMethods';
import ComplaintsManager from './components/ComplaintsManager';
import AdminPaymentsManager from './components/AdminPaymentsManager';
import TenantPayRent from './components/TenantPayRent';
import TenantPaymentHistory from './components/TenantPaymentHistory';
import TenantRequests from './components/TenantRequests';
import TenantSettings from './components/TenantSettings';
import TenantDashboard from './components/TenantDashboard';
import Messages from './components/Messages';
import SASubscriptions from './components/SASubscriptions';
import SAPayments from './components/SAPayments';
import SAAnnouncements from './components/SAAnnouncements';
import SARevenueAnalytics from './components/SARevenueAnalytics';
import AdminRevenueAnalytics from './components/AdminRevenueAnalytics';
import Footer from './components/Footer';

// Map & Property Components
import PropertySearch from './components/PropertySearch';
import PropertyMap from './components/PropertyMap';
import AddPropertyForm from './components/AddPropertyForm';
import PropertyModeration from './components/PropertyModeration';

// --- RESTORED HIGH-END LOGIN SCREEN ---
const LoginScreen = ({ isDark }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      console.error('Login error:', err.message);
      if (err.message?.includes('ACCOUNT_FROZEN_BY_ADMIN')) setError('FROZEN_TENANT');
      else if (err.message?.includes('SUBSCRIPTION_FROZEN')) setError('FROZEN_ADMIN');
      else setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const loginStyles = {
    container: { 
      display: 'flex', 
      minHeight: '100vh', 
      fontFamily: "'Inter', sans-serif",
      background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat fixed`,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    },
    glassCard: {
      display: 'flex',
      maxWidth: '1000px',
      width: '100%',
      minHeight: '600px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '30px',
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    leftPanel: { 
      flex: 1, 
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
      color: 'white',
      padding: '60px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      position: 'relative'
    },
    rightPanel: { 
      flex: 1.2, 
      padding: '60px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: 'white'
    },
    quoteHeader: { fontSize: '12px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px', color: '#667eea' },
    mainQuote: { fontSize: '40px', fontWeight: '800', lineHeight: '1.2', marginBottom: '20px' },
    quoteText: { fontSize: '15px', lineHeight: '1.6', opacity: 0.8, marginBottom: '40px' },
    branding: { marginTop: 'auto' },
    logo: { fontSize: '24px', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' },
    welcomeTitle: { fontSize: '32px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' },
    welcomeSubtitle: { fontSize: '15px', color: '#64748b', marginBottom: '30px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '14px', fontWeight: '600', color: '#1e293b' },
    inputWrapper: { position: 'relative' },
    inputIcon: { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 },
    input: { 
      width: '100%', 
      padding: '14px 16px 14px 45px', 
      border: '1px solid #e2e8f0', 
      borderRadius: '12px', 
      fontSize: '15px', 
      background: '#f8fafc',
      outline: 'none',
      transition: 'all 0.2s'
    },
    signInButton: { 
      width: '100%', 
      padding: '16px', 
      background: '#1e293b', 
      color: 'white', 
      border: 'none', 
      borderRadius: '12px', 
      fontSize: '16px', 
      fontWeight: '700', 
      cursor: 'pointer',
      marginTop: '10px',
      transition: 'all 0.2s'
    },
    loginFooter: {
      marginTop: '30px',
      paddingTop: '20px',
      borderTop: '1px solid #f1f5f9',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '13px'
    }
  };

  if (error === 'FROZEN_TENANT' || error === 'FROZEN_ADMIN') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 40, maxWidth: 450, width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{error === 'FROZEN_TENANT' ? '⏳' : '🔒'}</div>
          <h2 style={{ margin: '0 0 16px 0', color: error === 'FROZEN_TENANT' ? '#1f2937' : '#dc2626' }}>
            {error === 'FROZEN_TENANT' ? 'Account Temporarily Unavailable' : 'Subscription Expired'}
          </h2>
          <p style={{ margin: '0 0 24px 0', color: '#6b7280' }}>
            {error === 'FROZEN_TENANT' ? "Your property manager's account is currently inactive." : "Your account has been frozen due to an overdue subscription."}
          </p>
          <div style={{ padding: 16, background: error === 'FROZEN_TENANT' ? '#fef3c7' : '#fee2e2', borderRadius: 8, marginBottom: 24 }}>
            <strong style={{ color: error === 'FROZEN_TENANT' ? '#92400e' : '#991b1b' }}>Contact to Renew:</strong><br/>
            <span style={{ color: error === 'FROZEN_TENANT' ? '#92400e' : '#991b1b' }}>📞 0711 333 436<br/>📧 sa@domusea.com</span>
          </div>
          <button onClick={() => window.location.href = 'tel:0711333436'} style={{ ...loginStyles.signInButton, marginBottom: 12 }}>📞 Call Now</button>
          <button onClick={() => { setError(''); setEmail(''); setPassword(''); }} style={{ ...loginStyles.signInButton, background: '#f3f4f6', color: '#374151' }}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className={isDark ? 'dark' : ''} style={loginStyles.container}>
      <div style={loginStyles.glassCard} className="login-card">
        <div className="login-left" style={loginStyles.leftPanel}>
          <div style={loginStyles.quoteHeader}>A WISE QUOTE</div>
          <h1 style={loginStyles.mainQuote}>Build Better.<br/>Manage Smarter.</h1>
          <p style={loginStyles.quoteText}>"The art of building is not just about structures; it's about creating spaces where communities thrive. DomusEA handles the details so you can focus on the home."</p>
          <div style={loginStyles.branding}>
            <div style={loginStyles.logo}>🏠 DomusEA</div>
            <div style={{fontSize: '14px', opacity: 0.7, marginTop: '5px'}}>Property Management Redefined</div>
          </div>
        </div>

        <div className="login-right" style={loginStyles.rightPanel}>
          <div style={{width: '100%'}}>
            <h2 style={loginStyles.welcomeTitle}>Welcome Back</h2>
            <p style={loginStyles.welcomeSubtitle}>Enter your credentials to access your account</p>

            <form style={loginStyles.form} onSubmit={handleLogin}>
              {error && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>⚠️ {error}</div>
              )}
              <div style={loginStyles.inputGroup}>
                <label style={loginStyles.label}>Email Address</label>
                <div style={loginStyles.inputWrapper}>
                  <span style={loginStyles.inputIcon}>📧</span>
                  <input type="email" placeholder="name@company.com" style={loginStyles.input} value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div style={loginStyles.inputGroup}>
                <label style={loginStyles.label}>Password</label>
                <div style={loginStyles.inputWrapper}>
                  <span style={loginStyles.inputIcon}>🔒</span>
                  <input type="password" placeholder="••••••••" style={loginStyles.input} value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </div>
              <button type="submit" disabled={loading} style={loginStyles.signInButton}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div style={loginStyles.loginFooter}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <a href="tel:0711333436" style={{ color: '#1e293b', textDecoration: 'none' }}>📞 Call</a>
                <a href="https://wa.me/254711333436" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '600' }}>💬 WhatsApp</a>
              </div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>
                Developed by <span style={{ color: '#667eea', fontWeight: '600' }}>Elizon Tech</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) { 
          .login-card { 
            flex-direction: column !important;
            margin: 15px !important;
            border-radius: 20px !important;
            min-height: auto !important;
          }
          .login-left { 
            padding: 40px 30px !important;
            min-height: 200px !important;
          }
          .login-right { 
            padding: 40px 30px !important;
          }
          .mainQuote { font-size: 28px !important; }
          .welcomeTitle { font-size: 24px !important; }
        }
      `}</style>
    </div>
  );
};

// --- SUBSCRIPTION EXPIRED ---
const SubscriptionExpired = ({ userProfile, logout }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Subscription Overdue</h1>
      <p className="text-slate-500 mb-6 text-sm">Your account has been frozen. Please renew your subscription to regain access to your properties.</p>
      <div className="bg-slate-50 rounded-xl p-4 text-left mb-6 border border-slate-100">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Details</div>
        <div className="text-sm font-bold text-slate-700">{userProfile?.name}</div>
        <div className="text-xs text-slate-500">KSh {userProfile?.subscription_fee?.toLocaleString()} Due</div>
      </div>
      <button onClick={() => window.location.href = 'tel:0711333436'} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl mb-3">📞 Call Support to Renew</button>
      <button onClick={logout} className="w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">Logout</button>
    </div>
  </div>
);

// --- MAIN APP CONTENT ROUTER ---
const AppContent = ({ userProfile, activeTab }) => {
  const roles = {
    supreme_admin: {
      dashboard: <SADashboard />,
      'property-moderation': <PropertyModeration />,
      'property-map': <PropertyMap />,
      'manage-admins': <ManageAdmins />,
      'sa-subscriptions': <SASubscriptions />,
      'sa-revenue': <SARevenueAnalytics />,
      'sa-payments': <SAPayments />,
      'sa-announcements': <SAAnnouncements />,
      messages: <Messages />
    },
    admin: {
      dashboard: <PropertyAdminDashboard />,
      'add-property': <AddPropertyForm />,
      'property-map': <PropertyMap adminId={userProfile?.id} />,
      'manage-tenants': <ManageTenants />,
      occupancy: <OccupancyGrid />,
      'payment-methods': <AdminPaymentMethods />,
      'admin-payments': <AdminPaymentsManager />,
      'admin-revenue': <AdminRevenueAnalytics />,
      complaints: <ComplaintsManager />,
      messages: <Messages />
    },
    tenant: {
      dashboard: <TenantDashboard />,
      'pay-rent': <TenantPayRent />,
      'payment-history': <TenantPaymentHistory />,
      'tenant-requests': <TenantRequests />,
      messages: <Messages />,
      settings: <TenantSettings />
    }
  };
  return roles[userProfile?.role]?.[activeTab] || roles[userProfile?.role]?.dashboard || <div>Not Found</div>;
};

// --- MAIN APP ---
function App() {
  const { userProfile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.className = isDark ? 'dark' : '';
  }, [isDark]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-400">Loading DomusEA...</div>;
  if (!userProfile) return <LoginScreen isDark={isDark} />;
  if (userProfile.role === 'admin' && userProfile.subscription_status === 'Overdue') return <SubscriptionExpired userProfile={userProfile} logout={logout} />;

  const menuItems = {
    supreme_admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'property-moderation', label: 'Moderation', icon: '🛡️' },
      { id: 'property-map', label: 'Map', icon: '🗺️' },
      { id: 'manage-admins', label: 'Admins', icon: '👥' },
      { id: 'sa-subscriptions', label: 'Subscriptions', icon: '💳' },
      { id: 'sa-revenue', label: 'Revenue', icon: '📈' },
      { id: 'sa-payments', label: 'Payments', icon: '💰' },
      { id: 'messages', label: 'Messages', icon: '💬' }
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'add-property', label: 'Add Property', icon: '➕' },
      { id: 'property-map', label: 'Map', icon: '📍' },
      { id: 'manage-tenants', label: 'Tenants', icon: '👥' },
      { id: 'occupancy', label: 'Occupancy', icon: '🏢' },
      { id: 'admin-payments', label: 'Payments', icon: '💰' },
      { id: 'admin-revenue', label: 'Analytics', icon: '📈' },
      { id: 'complaints', label: 'Requests', icon: '📩' },
      { id: 'messages', label: 'Messages', icon: '💬' }
    ],
    tenant: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'pay-rent', label: 'Pay Rent', icon: '💳' },
      { id: 'payment-history', label: 'History', icon: '📜' },
      { id: 'tenant-requests', label: 'Requests', icon: '📩' },
      { id: 'messages', label: 'Messages', icon: '💬' }
    ]
  };

  const currentMenu = menuItems[userProfile?.role] || [];

  return (
    <div className={`flex min-h-screen bg-slate-50 text-slate-900 ${isDark ? 'dark' : ''}`}>
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Industry Standard Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div className="text-xl font-black tracking-tighter">DomusEA</div>
            <button className="md:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>✕</button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {currentMenu.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button onClick={() => setIsDark(!isDark)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all font-bold text-sm mb-2">
              <span>{isDark ? '☀️' : '🌙'}</span> {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs">{userProfile?.name?.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black truncate">{userProfile?.name}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{userProfile?.role?.replace('_', ' ')}</div>
              </div>
              <button onClick={logout} className="text-slate-500 hover:text-red-400 text-xs font-black uppercase">Exit</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header - Mobile Only */}
        <header className="md:hidden flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="text-2xl">☰</button>
          <div className="font-black text-lg tracking-tighter text-blue-600">DomusEA</div>
          <div className="w-8"></div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <AppContent userProfile={userProfile} activeTab={activeTab} />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
