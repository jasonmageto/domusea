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
    // Check for frozen account errors using .includes()
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

  // 🔥 FROZEN TENANT SCREEN
  if (error === 'FROZEN_TENANT') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        padding: 20
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 40,
          maxWidth: 450,
          width: '100%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
          <h2 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>
            Account Temporarily Unavailable
          </h2>
          <p style={{ margin: '0 0 24px 0', color: '#6b7280', lineHeight: 1.6 }}>
            Your property manager's account is currently inactive due to a maintenance issue.
          </p>
          <div style={{
            padding: 16,
            background: '#fef3c7',
            borderRadius: 8,
            marginBottom: 24,
            textAlign: 'left'
          }}>
            <strong style={{ color: '#92400e' }}>What to do:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, color: '#92400e', lineHeight: 1.8 }}>
              <li>Contact your Manager</li>
              <li>They need to renew their subscription</li>
              <li>You'll regain access immediately after. Kindly be patient.</li>
            </ul>
          </div>
          <button
            onClick={() => {
              setError('');
              setEmail('');
              setPassword('');
              window.location.reload();
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // 🔥 FROZEN ADMIN SCREEN
  if (error === 'FROZEN_ADMIN') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        padding: 20
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 40,
          maxWidth: 450,
          width: '100%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
          <h2 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>
            Subscription Expired
          </h2>
          <p style={{ margin: '0 0 24px 0', color: '#6b7280' }}>
            Your account has been frozen due to an overdue subscription.
          </p>
          <div style={{
            padding: 16,
            background: '#fee2e2',
            borderRadius: 8,
            marginBottom: 24
          }}>
            <strong style={{ color: '#991b1b' }}>Contact to Renew:</strong><br/>
            <span style={{ color: '#991b1b' }}>
              📞 0711 333 436<br/>
              📧 sa@domusea.com
            </span>
          </div>
          <button
            onClick={() => window.location.href = 'tel:0711333436'}
            style={{
              width: '100%',
              padding: '12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 12
            }}
          >
            📞 Call Now
          </button>
          <button
            onClick={() => {
              setError('');
              setEmail('');
              setPassword('');
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f3f4f6',
              color: '#374151',
              border: '2px solid #d1d5db',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ✅ DEFAULT LOGIN FORM
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', fontFamily: "'Inter', sans-serif", background: '#fff' }}>
      <div className="login-left" style={{
        flex: 1,
        background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        color: 'white'
      }}>
        <div style={{ maxWidth: '450px' }}>
          <h3 style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '14px', marginBottom: '20px', opacity: 0.8 }}>A WISE QUOTE</h3>
          <h1 style={{ fontSize: '48px', lineHeight: '1.1', fontWeight: '700', marginBottom: '24px' }}>Build Better.<br/>Manage Smarter.</h1>
          <p style={{ fontSize: '18px', lineHeight: '1.6', opacity: 0.9 }}>
            "The art of building is not just about structures; it's about creating spaces where communities thrive. DomusEA handles the details so you can focus on the home."
          </p>
        </div>
      </div>

      <div className="login-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '600', color: '#111', margin: '0 0 8px 0' }}>Welcome Back</h2>
            <p style={{ color: '#666', margin: 0 }}>Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleLogin}>
            {error && error !== 'FROZEN_TENANT' && error !== 'FROZEN_ADMIN' && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#333' }}>Email Address</label>
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} 
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#333' }}>Password</label>
              <input 
                type="password" 
                placeholder="Enter your password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} 
              />
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginBottom: '24px', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
            
            <p style={{ textAlign: 'center', color: '#888', fontSize: '14px' }}>Restricted Access • Authorized Personnel Only</p>
          </form>
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .login-left { display: none !important; } .login-right { width: '100%; flex: none; } }`}</style>
    </div>
  );
};

// --- SUBSCRIPTION EXPIRED PAGE ---
const SubscriptionExpired = ({ userProfile, logout }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 40,
        maxWidth: 500,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: 80,
          height: 80,
          background: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 40
        }}>
          ⚠️
        </div>
        <h1 style={{ margin: '0 0 16px 0', color: '#111', fontSize: 28 }}>
          Subscription Expired
        </h1>
        <p style={{ color: '#666', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          Your DomusEA admin account has been frozen due to an overdue subscription. 
          To restore access to your property management dashboard, please renew your subscription.
        </p>
        <div style={{
          background: '#f3f4f6',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          textAlign: 'left'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#111', fontSize: 16 }}>
            📋 Account Details
          </h3>
          <div style={{ fontSize: 14, color: '#374151' }}>
            <p style={{ margin: '8px 0' }}><strong>Name:</strong> {userProfile?.name}</p>
            <p style={{ margin: '8px 0' }}><strong>Email:</strong> {userProfile?.email}</p>
            <p style={{ margin: '8px 0' }}>
              <strong>Subscription Due:</strong>{' '}
              {userProfile?.subscription_due 
                ? new Date(userProfile.subscription_due).toLocaleDateString('en-GB')
                : 'Overdue'
              }
            </p>
          </div>
        </div>
        <div style={{
          background: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: 16 }}>
            📞 Contact to Renew
          </h3>
          <p style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: 14 }}>
            Reach out to the Administrator to renew your subscription:
          </p>
          <div style={{ fontSize: 14, color: '#1e40af' }}>
            <p style={{ margin: '8px 0', fontWeight: 600 }}>📱 Phone: 0711 333 436</p>
            <p style={{ margin: '8px 0' }}>📧 Email: sa@domusea.com</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={logout} style={{ padding: '12px 24px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Logout</button>
          <button onClick={() => window.location.href = 'tel:0711333436'} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>📞 Call Now</button>
          <button onClick={() => window.location.href = 'mailto:sa@domusea.com?subject=Subscription Renewal Request'} style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>📧 Email</button>
        </div>
        <p style={{ margin: '24px 0 0 0', fontSize: 12, color: '#9ca3af' }}>
          Once your subscription is renewed, you'll regain full access to your dashboard.
        </p>
      </div>
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
    <div className={isDark ? 'dark' : ''}>
      <div className="mobile-header">
        <button className="btn" onClick={() => setActivePage('dashboard')}>☰ Menu</button>
        <span>DomusEA</span>
        <button className="btn" onClick={logout}>Logout</button>
      </div>
      <div className="app">
        <Sidebar 
          active={activePage} 
          onNav={setActivePage} 
          isDark={isDark} 
          toggleTheme={toggleTheme} 
          logout={logout} 
          role={userProfile.role} 
          user={userProfile} 
        />
        <main className="main">
          <DashboardContent activePage={activePage} role={userProfile.role} userProfile={userProfile} />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}