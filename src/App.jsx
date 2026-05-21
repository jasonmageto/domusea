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

// --- LOGIN SCREEN ---
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

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-slate-900 ${isDark ? 'dark' : ''}`} style={{
      background: `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat fixed`
    }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-slate-900 mb-2">DomusEA</div>
          <p className="text-slate-500 text-sm">Professional Property Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 font-bold">⚠️ {error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="admin@domusea.com" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-4">
            <a href="tel:0711333436" className="text-slate-400 hover:text-slate-900 transition-colors">📞</a>
            <a href="https://wa.me/254711333436" className="text-slate-400 hover:text-green-500 transition-colors">💬</a>
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            By <span className="text-blue-500">Elizon Tech</span>
          </div>
        </div>
      </div>
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
          <div className="font-black text-lg tracking-tighter">DomusEA</div>
          <div className="w-8"></div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
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
