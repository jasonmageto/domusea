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
    container: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    leftPanel: { 
      flex: 1, 
      background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat`, 
      position: 'relative', 
      display: 'flex', 
      alignItems: 'center', 
      padding: '60px' 
    },
    overlay: { position: 'relative', zIndex: 2, maxWidth: '500px' },
    quoteContainer: { color: 'white' },
    quoteHeader: { fontSize: '12px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px', opacity: 0.9 },
    mainQuote: { fontSize: '48px', fontWeight: '700', lineHeight: '1.2', marginBottom: '30px', letterSpacing: '-1px' },
    quoteText: { fontSize: '16px', lineHeight: '1.8', opacity: 0.9, marginBottom: '40px', fontStyle: 'italic' },
    branding: { marginTop: '40px' },
    logo: { fontSize: '24px', fontWeight: '700', marginBottom: '8px' },
    tagline: { fontSize: '14px', opacity: 0.8 },
    rightPanel: { 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      background: 'var(--bg, #ffffff)', 
      color: 'var(--text, #111827)',
      position: 'relative',
      transition: 'background 0.3s, color 0.3s'
    },
    topBar: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 },
    contactInfo: { display: 'flex', gap: '24px', alignItems: 'center' },
    contactItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', fontWeight: '500' },
    whatsappText: { color: '#10b981', fontWeight: '600' },
    developerInfo: { fontSize: '13px', color: 'var(--gray, #6b7280)' },
    developer: { color: 'var(--blue, #667eea)', fontWeight: '600' },
    loginContainer: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 40px', maxWidth: '450px', margin: '0 auto', width: '100%' },
    header: { marginBottom: '40px' },
    logoSmall: { fontSize: '20px', fontWeight: '700', color: 'var(--blue, #667eea)', marginBottom: '20px' },
    welcomeTitle: { fontSize: '32px', fontWeight: '700', color: 'var(--text, #111827)', marginBottom: '8px', letterSpacing: '-0.5px' },
    welcomeSubtitle: { fontSize: '15px', color: 'var(--gray, #6b7280)', lineHeight: '1.5' },
    form: { display: 'flex', flexDirection: 'column', gap: '24px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '14px', fontWeight: '600', color: 'var(--text, #111827)', letterSpacing: '0.3px' },
    inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    inputIcon: { position: 'absolute', left: '16px', fontSize: '18px', zIndex: 1, opacity: 0.7 },
    input: { 
      width: '100%', 
      padding: '14px 16px 14px 48px', 
      border: '2px solid var(--border, #e5e7eb)', 
      borderRadius: '12px', 
      fontSize: '15px', 
      outline: 'none', 
      background: 'var(--input-bg, #f9fafb)', 
      color: 'var(--text, #111827)',
      boxSizing: 'border-box' 
    },
    signInButton: { width: '100%', padding: '16px', background: 'var(--text, #111827)', color: 'var(--bg, #ffffff)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    footer: { 
      padding: '24px 40px', 
      borderTop: '1px solid var(--border, #e5e7eb)', 
      background: 'var(--footer-bg, #f9fafb)', 
      flexShrink: 0 
    },
    securityBadge: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af', fontWeight: '500' }
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
      <div className="login-left" style={loginStyles.leftPanel}>
        <div style={loginStyles.overlay}>
          <div style={loginStyles.quoteContainer}>
            <div style={loginStyles.quoteHeader}>A WISE QUOTE</div>
            <h1 style={loginStyles.mainQuote}>Build Better.<br/>Manage Smarter.</h1>
            <p style={loginStyles.quoteText}>"The art of building is not just about structures; it's about creating spaces where communities thrive. DomusEA handles the details so you can focus on the home."</p>
            <div style={loginStyles.branding}>
              <div style={loginStyles.logo}>🏠 DomusEA</div>
              <div style={loginStyles.tagline}>Property Management Redefined</div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right" style={loginStyles.rightPanel}>
        {/* Mobile Background Image - only visible on mobile */}
        <div className="md:hidden absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
            alt="Background"
            className="w-full h-full object-cover opacity-20"
          />
        </div>

        <div style={loginStyles.loginContainer} className="relative z-10">
          <div style={loginStyles.header}>
            <div style={loginStyles.logoSmall}>🏠 DomusEA</div>
            <h2 style={loginStyles.welcomeTitle}>Welcome Back</h2>
            <p style={loginStyles.welcomeSubtitle}>Enter your credentials to access your account</p>
          </div>

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
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <span style={{ fontSize: '18px' }}>→</span>
            </button>
            <p style={{ textAlign: 'center', color: '#888', fontSize: '14px', marginTop: '8px' }}>Restricted Access • Authorized Personnel Only</p>
          </form>
        </div>

        <div style={{ ...loginStyles.footer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', fontSize: '12px' }} className="relative z-10">
          <div style={{ display: 'flex', gap: '20px' }}>
            <span style={{ color: '#374151' }}>📞 0711 333 436</span>
            <a href="https://wa.me/254711333436" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '600' }}>💬 WhatsApp</a>
          </div>
          <div style={{ color: '#6b7280' }}>
            © 2026 DomusEA | Developed by <span style={{ color: '#667eea', fontWeight: '600' }}>Elizon Tech</span>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) { 
          .login-left { display: none !important; }
          .login-right {
            background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat !important;
          }
          .login-right > div {
            background: rgba(var(--bg-rgb, 255, 255, 255), 0.95);
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            padding: 40px 20px !important;
            margin: 20px !important;
            backdrop-filter: blur(10px);
          }
          .login-right .welcomeTitle { color: #111827 !important; }
          .login-right .welcomeSubtitle { color: #4b5563 !important; }
          .login-right label { color: #374151 !important; }
          .login-right .developerInfo { color: #4b5563 !important; }
          .login-right .securityBadge { color: #6b7280 !important; }
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
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-[55]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-[60]
        w-64 bg-[var(--card)] border-r border-[var(--border)]
        transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
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
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--card)] border-b border-[var(--border)] z-50 flex items-center justify-between px-4 shadow-sm">
          <button 
            className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Menu"
          >
            <span style={{fontSize: '24px'}}>{isSidebarOpen ? '✕' : '☰'}</span>
          </button>
          <div className="font-bold text-lg">Domusea</div>
          <button 
            className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors"
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
