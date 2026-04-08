import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-box card">
      <h2>🏢 DomusEA Login</h2>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
          style={{padding: 8, width: '100%', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 4}} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{padding: 8, width: '100%', marginBottom: 12, border: '1px solid var(--border)', borderRadius: 4}} 
        />
        {error && <p style={{color: 'var(--red)', marginBottom: 8}}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{width: '100%'}}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
};

const Sidebar = ({ active, onNav, isDark, toggleTheme, logout, role }) => {
  if (!role) return null;
  
  return (
    <div className="sidebar">
      <h3 style={{marginBottom: 16}}>🏠 DomusEA</h3>
      
      {role === 'sa' && (
        <>
          <button className={`nav-btn ${active==='dashboard'?'active':''}`} onClick={()=>onNav('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${active==='admins'?'active':''}`} onClick={()=>onNav('admins')}>Manage Admins</button>
          <button className={`nav-btn ${active==='subscriptions'?'active':''}`} onClick={()=>onNav('subscriptions')}>Subscriptions</button>
          <button className={`nav-btn ${active==='payments'?'active':''}`} onClick={()=>onNav('payments')}>Payments</button>
          <button className={`nav-btn ${active==='announcements'?'active':''}`} onClick={()=>onNav('announcements')}>Announcements</button>
          <button className={`nav-btn ${active==='messages'?'active':''}`} onClick={()=>onNav('messages')}>Messages</button>
        </>
      )}
      
      {role === 'admin' && (
        <>
          <button className={`nav-btn ${active==='dashboard'?'active':''}`} onClick={()=>onNav('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${active==='tenants'?'active':''}`} onClick={()=>onNav('tenants')}>Manage Tenants</button>
          <button className={`nav-btn ${active==='occupancy'?'active':''}`} onClick={()=>onNav('occupancy')}>Occupancy Grid</button>
          <button className={`nav-btn ${active==='payment-methods'?'active':''}`} onClick={()=>onNav('payment-methods')}>Payment Methods</button>
          <button className={`nav-btn ${active==='payments'?'active':''}`} onClick={()=>onNav('payments')}>Payments</button>
          <button className={`nav-btn ${active==='complaints'?'active':''}`} onClick={()=>onNav('complaints')}>Complaints</button>
          <button className={`nav-btn ${active==='messages'?'active':''}`} onClick={()=>onNav('messages')}>Messages</button>
        </>
      )}

      {role === 'tenant' && (
        <>
          <button className={`nav-btn ${active==='dashboard'?'active':''}`} onClick={()=>onNav('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${active==='pay'?'active':''}`} onClick={()=>onNav('pay')}>Pay Rent</button>
          <button className={`nav-btn ${active==='history'?'active':''}`} onClick={()=>onNav('history')}>Payment History</button>
          <button className={`nav-btn ${active==='requests'?'active':''}`} onClick={()=>onNav('requests')}>My Requests</button>
          <button className={`nav-btn ${active==='settings'?'active':''}`} onClick={()=>onNav('settings')}>Settings</button>
          <button className={`nav-btn ${active==='messages'?'active':''}`} onClick={()=>onNav('messages')}>Messages</button>
        </>
      )}

      {/* Theme Toggle Button */}
      <button 
        className="btn" 
        style={{marginTop: 'auto', marginBottom: 8}} 
        onClick={toggleTheme}
      >
        {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>
      
      <button className="btn" style={{background: 'var(--red)', color: 'white'}} onClick={logout}>
        Logout
      </button>
    </div>
  );
};

const DashboardContent = ({ activePage, role, userProfile }) => {
  if (!role) {
    return <div className="card" style={{textAlign:'center', padding:40}}>Loading...</div>;
  }

  // Handle Messages page for all roles
  if (activePage === 'messages') {
    return <Messages userProfile={userProfile} />;
  }

  if (role === 'sa') {
    switch (activePage) {
      case 'admins': return <ManageAdmins />;
      case 'subscriptions': return <SASubscriptions />;
      case 'payments': return <SAPayments />;
      case 'announcements': return <SAAnnouncements />;
      default: return <SADashboard />;
    }
  }
  
  if (role === 'admin') {
    switch (activePage) {
      case 'tenants': return <ManageTenants />;
      case 'occupancy': return <OccupancyGrid />;
      case 'payment-methods': return <AdminPaymentMethods />;
      case 'payments': return <AdminPaymentsManager />;
      case 'complaints': return <ComplaintsManager />;
      default: return <PropertyAdminDashboard />;
    }
  }

  if (role === 'tenant') {
    switch (activePage) {
      case 'dashboard': return <TenantDashboard />;
      case 'pay': return <TenantPayRent />;
      case 'history': return <TenantPaymentHistory />;
      case 'requests': return <TenantRequests />;
      case 'settings': return <TenantSettings />;
      default: return <TenantDashboard />;
    }
  }

  return <div className="card"><h2>Welcome</h2><p>Role: {role}</p></div>;
};

const AppContent = () => {
  const { userProfile, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');

  // Load saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.body.classList.add('dark');
    }
  }, []);

  // Toggle theme function
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

  if (!userProfile) {
    return <LoginScreen />;
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
        />
        
        <main className="main">
          <DashboardContent 
            activePage={activePage} 
            role={userProfile.role} 
            userProfile={userProfile} 
          />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}