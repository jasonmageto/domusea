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
const LoginScreen = () => {
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
    rightPanel: { flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', position: 'relative' },
    topBar: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 },
    contactInfo: { display: 'flex', gap: '24px', alignItems: 'center' },
    contactItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', fontWeight: '500' },
    whatsappText: { color: '#10b981', fontWeight: '600' },
    developerInfo: { fontSize: '13px', color: '#6b7280' },
    developer: { color: '#667eea', fontWeight: '600' },
    loginContainer: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 40px', maxWidth: '450px', margin: '0 auto', width: '100%' },
    header: { marginBottom: '40px' },
    logoSmall: { fontSize: '20px', fontWeight: '700', color: '#667eea', marginBottom: '20px' },
    welcomeTitle: { fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' },
    welcomeSubtitle: { fontSize: '15px', color: '#6b7280', lineHeight: '1.5' },
    form: { display: 'flex', flexDirection: 'column', gap: '24px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '14px', fontWeight: '600', color: '#374151', letterSpacing: '0.3px' },
    inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    inputIcon: { position: 'absolute', left: '16px', fontSize: '18px', zIndex: 1, opacity: 0.5 },
    input: { width: '100%', padding: '14px 16px 14px 48px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' },
    signInButton: { width: '100%', padding: '16px', background: '#111827', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    footer: { padding: '24px 40px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 },
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
    <div style={loginStyles.container}>
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
        <div style={loginStyles.topBar}>
          <div style={loginStyles.contactInfo}>
            <span style={loginStyles.contactItem}><span>📞</span> 0711 333 436</span>
            <span style={loginStyles.contactItem}><span>💬</span> <span style={loginStyles.whatsappText}>WhatsApp</span></span>
          </div>
          <div style={loginStyles.developerInfo}>
            © 2026 DomusEA | Developed by <span style={loginStyles.developer}>Elizon Tech</span>
          </div>
        </div>

        <div style={loginStyles.loginContainer}>
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
          </form>
        </div>

        <div style={loginStyles.footer}>
          <div style={loginStyles.securityBadge}>
            <span>🔐</span>
            <span>Restricted Access • Authorized Personnel Only</span>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 768px) { .login-left { display: none !important; } }`}</style>
    </div>
  );
};

// --- SUBSCRIPTION EXPIRED PAGE ---
const SubscriptionExpired = ({ userProfile, logout }) => {
  const expiredStyles = {
    container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f3f4f6', fontFamily: "'Inter', sans-serif" },
    topBar: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#ffffff' },
    content: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
    card: { background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' },
    icon: { fontSize: '48px', marginBottom: '20px' },
    title: { fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '16px' },
    text: { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', marginBottom: '32px' },
    details: { background: '#f3f4f6', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '24px' },
    button: { width: '100%', padding: '16px', background: '#111827', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' },
    secondaryButton: { width: '100%', padding: '14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }
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
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Account Information</div>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Admin:</strong> {userProfile?.name}</div>
              <div><strong>Email:</strong> {userProfile?.email}</div>
              <div><strong>Due Date:</strong> {userProfile?.subscription_due ? new Date(userProfile.subscription_due).toLocaleDateString() : 'Overdue'}</div>
            </div>
          </div>

          <button onClick={() => window.location.href = 'tel:0711333436'} style={expiredStyles.button}>
            <span>📞 Call Now</span>
          </button>
          <button onClick={logout} style={expiredStyles.secondaryButton}>Logout</button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

// --- SIDEBAR ---
const Sidebar = ({ active, onNav, isDark, toggleTheme, logout, role, user }) => {
  if (!role) return null;
  
  return (
    <div className="sidebar">
      <h3 style={{marginBottom: 16}}>🏠 DomusEA</h3>
      <div style={{ 
        padding: '12px', 
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
        borderRadius: '10px', 
        marginBottom: '20px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ 
            width: '36px', height: '36px', 
            background: 'var(--primary)', 
            color: 'white', 
            borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontWeight: 'bold', fontSize: '14px'
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>{user?.name || 'User'}</h4>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--gray)', textTransform: 'capitalize' }}>
              {role === 'sa' ? 'Supreme Admin' : role === 'admin' ? 'Property Admin' : 'Tenant'}
            </p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', wordBreak: 'break-all' }}>
          {user?.email}
        </p>
        {role === 'admin' && user?.subscription_status && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--gray)' }}>Subscription</span>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: user.subscription_status === 'Active' ? 'var(--green)' : 'var(--red)' }}>
              {user.subscription_status}
            </span>
          </div>
        )}
      </div>
      
      {role === 'sa' && (
        <>
          <button className={`nav-btn ${active==='dashboard'?'active':''}`} onClick={()=>onNav('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${active==='moderation'?'active':''}`} onClick={()=>onNav('moderation')}>🛡️ Property Moderation</button>
          <button className={`nav-btn ${active==='map'?'active':''}`} onClick={()=>onNav('map')}>🗺️ All Properties Map</button>
          <button className={`nav-btn ${active==='admins'?'active':''}`} onClick={()=>onNav('admins')}>Manage Admins</button>
          <button className={`nav-btn ${active==='subscriptions'?'active':''}`} onClick={()=>onNav('subscriptions')}>Subscriptions</button>
          <button className={`nav-btn ${active==='revenue'?'active':''}`} onClick={()=>onNav('revenue')}>Revenue Analytics</button>
          <button className={`nav-btn ${active==='payments'?'active':''}`} onClick={()=>onNav('payments')}>Payments</button>
          <button className={`nav-btn ${active==='announcements'?'active':''}`} onClick={()=>onNav('announcements')}>Announcements</button>
          <button className={`nav-btn ${active==='messages'?'active':''}`} onClick={()=>onNav('messages')}>Messages</button>
        </>
      )}
      
      {role === 'admin' && (
        <>
          <button className={`nav-btn ${active==='dashboard'?'active':''}`} onClick={()=>onNav('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${active==='map'?'active':''}`} onClick={()=>onNav('map')}>🗺️ Property Map</button>
          <button className={`nav-btn ${active==='occupancy'?'active':''}`} onClick={()=>onNav('occupancy')}>📊 Occupancy & Vacancies</button>
          <button className={`nav-btn ${active==='tenants'?'active':''}`} onClick={()=>onNav('tenants')}>Manage Tenants</button>
          <button className={`nav-btn ${active==='add-property'?'active':''}`} onClick={()=>onNav('add-property')}>➕ Add Property</button>
          <button className={`nav-btn ${active==='payment-methods'?'active':''}`} onClick={()=>onNav('payment-methods')}>Payment Methods</button>
          <button className={`nav-btn ${active==='payments'?'active':''}`} onClick={()=>onNav('payments')}>Payments</button>
          <button className={`nav-btn ${active==='revenue'?'active':''}`} onClick={()=>onNav('revenue')}>Revenue Analytics</button>
          <button className={`nav-btn ${active==='complaints'?'active':''}`} onClick={()=>onNav('complaints')}>Complaints</button>
          <button className={`nav-btn ${active==='messages'?'active':''}`} onClick={()=>onNav('messages')}>Messages</button>
        </>
      )}

      {role === 'tenant' && (
        <>
          <button className={`nav-btn ${active==='dashboard'?'active':''}`} onClick={()=>onNav('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${active==='search'?'active':''}`} onClick={()=>onNav('search')}>🗺️ Find Properties</button>
          <button className={`nav-btn ${active==='pay'?'active':''}`} onClick={()=>onNav('pay')}>Pay Rent</button>
          <button className={`nav-btn ${active==='history'?'active':''}`} onClick={()=>onNav('history')}>Payment History</button>
          <button className={`nav-btn ${active==='requests'?'active':''}`} onClick={()=>onNav('requests')}>My Requests</button>
          <button className={`nav-btn ${active==='settings'?'active':''}`} onClick={()=>onNav('settings')}>Settings</button>
          <button className={`nav-btn ${active==='messages'?'active':''}`} onClick={()=>onNav('messages')}>Messages</button>
        </>
      )}

      <button className="btn" style={{marginTop: 'auto', marginBottom: 8}} onClick={toggleTheme}>
        {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>
      
      <button className="btn" style={{background: 'var(--red)', color: 'white'}} onClick={logout}>
        Logout
      </button>
    </div>
  );
};

// --- DASHBOARD CONTENT ROUTER ---
const DashboardContent = ({ activePage, role, userProfile }) => {
  if (!role) return <div className="card" style={{textAlign:'center', padding:40}}>Loading...</div>;
  if (activePage === 'messages') return <Messages userProfile={userProfile} />;
  if (activePage === 'search' || activePage === 'map') return <PropertySearch />;

  if (role === 'sa') {
    switch (activePage) {
      case 'moderation': return <PropertyModeration />;
      case 'admins': return <ManageAdmins />;
      case 'subscriptions': return <SASubscriptions />;
      case 'revenue': return <SARevenueAnalytics />;
      case 'payments': return <SAPayments />;
      case 'announcements': return <SAAnnouncements />;
      case 'map': return <PropertyMap enableRealtime={true} />;
      default: return <SADashboard />;
    }
  }
  
  if (role === 'admin') {
    switch (activePage) {
      case 'tenants': return <ManageTenants />;
      case 'occupancy': return <OccupancyGrid />;
      case 'add-property': return <AddPropertyForm onBack={() => onNav('dashboard')} />;
      case 'payment-methods': return <AdminPaymentMethods />;
      case 'payments': return <AdminPaymentsManager />;
      case 'revenue': return <AdminRevenueAnalytics />;
      case 'complaints': return <ComplaintsManager />;
      case 'map': return <PropertyMap enableRealtime={true} />;
      default: return <PropertyAdminDashboard />;
    }
  }

  if (role === 'tenant') {
    switch (activePage) {
      case 'dashboard': return <TenantDashboard />;
      case 'search': return <PropertySearch />;
      case 'pay': return <TenantPayRent />;
      case 'history': return <TenantPaymentHistory />;
      case 'requests': return <TenantRequests />;
      case 'settings': return <TenantSettings />;
      default: return <TenantDashboard />;
    }
  }
  return <div className="card"><h2>Welcome</h2><p>Role: {role}</p></div>;
};

// --- MAIN APP COMPONENT ---
const AppContent = () => {
  const { userProfile, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.body.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Show login if no user
  if (!userProfile) {
    return <LoginScreen />;
  }

  // Show frozen screen if admin is frozen
  if (userProfile.role === 'admin' && userProfile.frozen) {
    return <SubscriptionExpired userProfile={userProfile} logout={logout} />;
  }

  return (
    <div className={isDark ? 'dark' : ''} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <div className="mobile-header">
        <button className="btn" onClick={() => setActivePage('dashboard')}>☰ Menu</button>
        <span>DomusEA</span>
        <button className="btn" onClick={logout}>Logout</button>
      </div>
      <div className="app" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar 
          active={activePage} 
          onNav={setActivePage} 
          isDark={isDark} 
          toggleTheme={toggleTheme} 
          logout={logout} 
          role={userProfile.role} 
          user={userProfile} 
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <main className="main" style={{ flex: 1, overflowY: 'auto' }}>
            <DashboardContent activePage={activePage} role={userProfile.role} userProfile={userProfile} />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}