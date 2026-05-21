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

// --- LOGIN SCREEN WITH FROZEN HANDLING ---
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
      if (err.message && err.message.includes('ACCOUNT_FROZEN_BY_ADMIN')) {
        setError('FROZEN_TENANT');
      } else if (err.message && err.message.includes('SUBSCRIPTION_FROZEN')) {
        setError('FROZEN_ADMIN');
      } else {
        setError(err.message || 'Failed to sign in');
      }
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

// --- SUBSCRIPTION EXPIRED PAGE ---
const SubscriptionExpired = ({ userProfile, logout }) => {
  const expiredStyles = {
    container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg, #f3f4f6)', color: 'var(--text, #111827)', fontFamily: "'Inter', sans-serif", transition: 'all 0.3s ease' },
    topBar: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border, #e5e7eb)', background: 'var(--card-bg, #ffffff)' },
    content: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
    card: { background: 'var(--card-bg, white)', borderRadius: '16px', padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border, #e5e7eb)' },
    icon: { fontSize: '48px', marginBottom: '20px' },
    title: { fontSize: '28px', fontWeight: '700', color: 'inherit', marginBottom: '16px' },
    text: { fontSize: '15px', color: 'var(--gray, #6b7280)', lineHeight: '1.6', marginBottom: '32px' },
    details: { background: 'var(--bg, #f3f4f6)', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '24px' },
    button: { width: '100%', padding: '16px', background: 'var(--text, #111827)', color: 'var(--bg, white)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' },
    secondaryButton: { width: '100%', padding: '14px', background: 'var(--bg, #f3f4f6)', color: 'inherit', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }
  };

  return (
    <div style={expiredStyles.container}>
      <div style={expiredStyles.topBar}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#667eea' }}>🏠 DomusEA</div>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          © 2026 DomusEA | Developed by <span style={{ color: '#667eea', fontWeight: '600' }}>Elizon Tech</span>
        </div>
      </div>
      
      <div style={expiredStyles.content}>
        <div style={expiredStyles.card}>
          <div style={expiredStyles.icon}>🔒</div>
          <h1 style={expiredStyles.title}>Subscription Expired</h1>
          <p style={expiredStyles.text}>Your admin account has been frozen due to an overdue subscription. Please renew to regain access.</p>
          
          <div style={expiredStyles.details}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>ACCOUNT DETAILS:</div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>Admin: {userProfile?.name}</div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>Plan: {userProfile?.subscription_plan}</div>
            <div style={{ fontSize: '14px', color: '#dc2626', fontWeight: '700' }}>Fee: KSh {userProfile?.subscription_fee?.toLocaleString()}</div>
          </div>

          <button onClick={() => window.location.href = 'tel:0711333436'} style={expiredStyles.button}>
            📞 Call Support to Renew
          </button>
          
          <button onClick={logout} style={expiredStyles.secondaryButton}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SIDEBAR COMPONENT ---
const Sidebar = ({ userProfile, activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, isDark, setIsDark }) => {
  const menuItems = {
    supreme_admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'property-moderation', label: 'Property Moderation', icon: '🛡️' },
      { id: 'property-map', label: 'All Properties Map', icon: '🗺️' },
      { id: 'manage-admins', label: 'Manage Admins', icon: '👥' },
      { id: 'sa-subscriptions', label: 'Subscriptions', icon: '💳' },
      { id: 'sa-revenue', label: 'Revenue Analytics', icon: '📈' },
      { id: 'sa-payments', label: 'Payments', icon: '💰' },
      { id: 'sa-announcements', label: 'Announcements', icon: '📢' },
      { id: 'messages', label: 'Messages', icon: '💬' }
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'add-property', label: 'Add Property', icon: '➕' },
      { id: 'property-map', label: 'My Properties Map', icon: '📍' },
      { id: 'manage-tenants', label: 'Manage Tenants', icon: '👥' },
      { id: 'occupancy', label: 'Occupancy Grid', icon: '🏢' },
      { id: 'payment-methods', label: 'Payment Methods', icon: '💳' },
      { id: 'admin-payments', label: 'Payment Management', icon: '💰' },
      { id: 'admin-revenue', label: 'Revenue Analytics', icon: '📈' },
      { id: 'complaints', label: 'Tenant Requests', icon: '📩' },
      { id: 'messages', label: 'Messages', icon: '💬' }
    ],
    tenant: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'pay-rent', label: 'Pay Rent', icon: '💳' },
      { id: 'payment-history', label: 'Payment History', icon: '📜' },
      { id: 'tenant-requests', label: 'Requests', icon: '📩' },
      { id: 'messages', label: 'Messages', icon: '💬' },
      { id: 'settings', label: 'Settings', icon: '⚙️' }
    ]
  };

  const currentMenu = menuItems[userProfile?.role] || [];

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-[60]
        w-72 bg-[var(--card)] border-r border-[var(--border)]
        transform ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} 
        md:translate-x-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        flex flex-col
      `}>
        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
          <div className="text-xl font-bold text-[var(--blue)]">🏠 DomusEA</div>
          <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${activeTab === item.id 
                  ? 'bg-[var(--blue)] text-white shadow-lg' 
                  : 'hover:bg-[var(--bg)] text-[var(--gray)]'}
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border)] space-y-2">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg)] text-[var(--gray)] transition-all"
          >
            <span>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <div className="flex items-center gap-3 px-4 py-3 text-[var(--gray)]">
            <div className="w-8 h-8 rounded-full bg-[var(--blue)] flex items-center justify-center text-white font-bold">
              {userProfile?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{userProfile?.name}</div>
              <div className="text-xs truncate opacity-70 uppercase">{userProfile?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

// --- MAIN APP CONTENT ROUTER ---
const AppContent = ({ userProfile, activeTab, setActiveTab, isDark }) => {
  if (userProfile.role === 'supreme_admin') {
    switch (activeTab) {
      case 'dashboard': return <SADashboard />;
      case 'property-moderation': return <PropertyModeration />;
      case 'property-map': return <PropertyMap />;
      case 'manage-admins': return <ManageAdmins />;
      case 'sa-subscriptions': return <SASubscriptions />;
      case 'sa-revenue': return <SARevenueAnalytics />;
      case 'sa-payments': return <SAPayments />;
      case 'sa-announcements': return <SAAnnouncements />;
      case 'messages': return <Messages />;
      default: return <SADashboard />;
    }
  }

  if (userProfile.role === 'admin') {
    switch (activeTab) {
      case 'dashboard': return <PropertyAdminDashboard />;
      case 'add-property': return <AddPropertyForm />;
      case 'property-map': return <PropertyMap adminId={userProfile.id} />;
      case 'manage-tenants': return <ManageTenants />;
      case 'occupancy': return <OccupancyGrid />;
      case 'payment-methods': return <AdminPaymentMethods />;
      case 'admin-payments': return <AdminPaymentsManager />;
      case 'admin-revenue': return <AdminRevenueAnalytics />;
      case 'complaints': return <ComplaintsManager />;
      case 'messages': return <Messages />;
      default: return <PropertyAdminDashboard />;
    }
  }

  if (userProfile.role === 'tenant') {
    switch (activeTab) {
      case 'dashboard': return <TenantDashboard />;
      case 'pay-rent': return <TenantPayRent />;
      case 'payment-history': return <TenantPaymentHistory />;
      case 'tenant-requests': return <TenantRequests />;
      case 'messages': return <Messages />;
      case 'settings': return <TenantSettings />;
      default: return <TenantDashboard />;
    }
  }

  return <div>Role not recognized.</div>;
};

// --- MAIN WRAPPER ---
function App() {
  const { userProfile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setIsDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.className = isDark ? 'dark' : '';
  }, [isDark]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">Loading DomusEA...</div>;

  if (!userProfile) return <LoginScreen isDark={isDark} />;

  // Handle Subscription Overdue for Admins
  if (userProfile.role === 'admin' && userProfile.subscription_status === 'Overdue') {
    return <SubscriptionExpired userProfile={userProfile} logout={logout} />;
  }

  return (
    <div className={`flex min-h-screen bg-[var(--bg)] text-[var(--text)] ${isDark ? 'dark' : ''}`}>
      <Sidebar 
        userProfile={userProfile} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Menu Toggle - Fixed and Improved */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--card)] border-b border-[var(--border)] z-[50] flex items-center justify-between px-4 shadow-sm backdrop-blur-md bg-opacity-90">
          <button 
            className="w-10 h-10 flex items-center justify-center hover:bg-[var(--bg)] rounded-xl transition-all active:scale-90"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open Menu"
          >
            <span style={{fontSize: '24px'}}>☰</span>
          </button>
          <div className="font-extrabold text-xl tracking-tight text-[var(--blue)]">DomusEA</div>
          <button 
            className="w-10 h-10 flex items-center justify-center hover:bg-[var(--bg)] rounded-xl transition-all active:scale-90"
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle Theme"
          >
            <span style={{fontSize: '20px'}}>{isDark ? '☀️' : '🌙'}</span>
          </button>
        </div>

        {/* Main Content Area - Added padding-top for mobile header */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 transition-all duration-300 ${isSidebarOpen ? 'md:ml-0' : ''}`}>
          <div className="max-w-7xl mx-auto pb-16">
            <AppContent 
              userProfile={userProfile} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              isDark={isDark}
            />
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
