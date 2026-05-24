import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import './styles/global.css';

// Component Imports
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
import PropertySearch from './components/PropertySearch';
import PropertyMap from './components/PropertyMap';
import AddPropertyForm from './components/AddPropertyForm';
import PropertyModeration from './components/PropertyModeration';
import LoginScreen from './components/LoginScreen';
import LoadingScreen from './components/LoadingScreen';

// Subscription Expired Component
const SubscriptionExpired = ({ userProfile, logout }) => (
  <div className="frozen-container">
    <div className="frozen-card animate-fadeIn">
      <span className="frozen-icon">🔒</span>
      <h1 className="frozen-title">Subscription Overdue</h1>
      <p className="frozen-text">Your account has been frozen due to an overdue subscription.</p>
      <div className="frozen-contact">
        <strong>Account Details</strong>
        <span>{userProfile?.name}</span>
        <span>KSh {userProfile?.subscription_fee?.toLocaleString() || '0'} Due</span>
      </div>
      <div className="frozen-buttons">
        <button onClick={() => window.location.href = 'tel:0711333436'} className="btn btn-primary btn-full">
          📞 Call Support
        </button>
        <button onClick={logout} className="btn btn-secondary btn-full">Logout</button>
      </div>
    </div>
  </div>
);

// Main App Component
function AppContent() {
  const { userProfile, loading, logout, error } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme
  useEffect(() => {
    const saved = localStorage.getItem('domusea-theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', !isDark ? 'dark' : 'light');
    localStorage.setItem('domusea-theme', !isDark ? 'dark' : 'light');
  };

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading screen
  if (loading) {
    return <LoadingScreen />;
  }

  // Show login if no user
  if (!userProfile) {
    return <LoginScreen isDark={isDark} toggleTheme={toggleTheme} error={error} />;
  }

  // Show subscription expired
  if (userProfile.role === 'admin' && userProfile.subscription_status === 'Overdue') {
    return <SubscriptionExpired userProfile={userProfile} logout={logout} />;
  }

  // Navigation menus by role
  const menuItems = {
    supreme_admin: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
      { id: 'property-moderation', label: 'Moderation', icon: 'fas fa-shield-alt' },
      { id: 'property-map', label: 'Map', icon: 'fas fa-map-marked-alt' },
      { id: 'manage-admins', label: 'Admins', icon: 'fas fa-users-cog' },
      { id: 'sa-subscriptions', label: 'Subscriptions', icon: 'fas fa-credit-card' },
      { id: 'sa-revenue', label: 'Revenue', icon: 'fas fa-chart-bar' },
      { id: 'sa-payments', label: 'Payments', icon: 'fas fa-money-bill-wave' },
      { id: 'sa-announcements', label: 'Announcements', icon: 'fas fa-bullhorn' },
      { id: 'messages', label: 'Messages', icon: 'fas fa-comments' }
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home' },
      { id: 'add-property', label: 'Add Property', icon: 'fas fa-plus-circle' },
      { id: 'property-map', label: 'Map', icon: 'fas fa-map-marked-alt' },
      { id: 'manage-tenants', label: 'Tenants', icon: 'fas fa-users' },
      { id: 'occupancy', label: 'Occupancy', icon: 'fas fa-th-large' },
      { id: 'admin-payments', label: 'Payments', icon: 'fas fa-money-bill-wave' },
      { id: 'admin-revenue', label: 'Analytics', icon: 'fas fa-chart-bar' },
      { id: 'complaints', label: 'Requests', icon: 'fas fa-inbox' },
      { id: 'messages', label: 'Messages', icon: 'fas fa-comments' }
    ],
    tenant: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home' },
      { id: 'pay-rent', label: 'Pay Rent', icon: 'fas fa-credit-card' },
      { id: 'payment-history', label: 'History', icon: 'fas fa-history' },
      { id: 'tenant-requests', label: 'Requests', icon: 'fas fa-inbox' },
      { id: 'messages', label: 'Messages', icon: 'fas fa-comments' },
      { id: 'settings', label: 'Settings', icon: 'fas fa-cog' }
    ]
  };

  // Components by role and tab
  const renderComponent = () => {
    const role = userProfile.role;
    
    if (role === 'supreme_admin') {
      switch(activeTab) {
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
    
    if (role === 'admin') {
      switch(activeTab) {
        case 'dashboard': return <PropertyAdminDashboard />;
        case 'add-property': return <AddPropertyForm />;
        case 'property-map': return <PropertyMap adminId={userProfile.id} />;
        case 'manage-tenants': return <ManageTenants />;
        case 'occupancy': return <OccupancyGrid />;
        case 'admin-payments': return <AdminPaymentsManager />;
        case 'admin-revenue': return <AdminRevenueAnalytics />;
        case 'complaints': return <ComplaintsManager />;
        case 'messages': return <Messages />;
        default: return <PropertyAdminDashboard />;
      }
    }
    
    if (role === 'tenant') {
      switch(activeTab) {
        case 'dashboard': return <TenantDashboard />;
        case 'pay-rent': return <TenantPayRent />;
        case 'payment-history': return <TenantPaymentHistory />;
        case 'tenant-requests': return <TenantRequests />;
        case 'messages': return <Messages />;
        case 'settings': return <TenantSettings />;
        default: return <TenantDashboard />;
      }
    }
    
    return <div className="card p-6">Unknown role</div>;
  };

  const currentMenu = menuItems[userProfile.role] || [];
  const userRole = userProfile.role.replace('_', ' ');

  return (
    <div className={`app-wrapper ${isDark ? 'dark' : ''}`}>
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          {/* Brand */}
          <a href="#" className="brand" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
            <i className="fas fa-building"></i>
            <span>DomusEA</span>
          </a>

          {/* Desktop Menu */}
          <ul className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            {currentMenu.map(item => (
              <li key={item.id}>
                <a
                  href="#"
                  className={activeTab === item.id ? 'active' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <i className={item.icon}></i>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {/* Right Actions */}
          <div className="nav-actions">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="theme-toggle">
              <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
              <span className="hide-mobile">{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* User Info */}
            <div className="user-info">
              <div className="user-avatar">
                {userProfile.name?.charAt(0)}{userProfile.name?.split(' ')?.[1]?.charAt(0) || ''}
              </div>
              <div className="user-details">
                <div className="user-name">{userProfile.name}</div>
                <div className="user-role">{userRole}</div>
              </div>
            </div>

            {/* Logout */}
            <button onClick={logout} className="btn btn-danger btn-sm">
              <i className="fas fa-sign-out-alt"></i>
              <span className="hide-mobile">Logout</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {renderComponent()}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="tel:0711333436"><i className="fas fa-phone"></i> 0711 333 436</a>
            <a href="https://wa.me/254711333436" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp"></i> WhatsApp
            </a>
            <a href="#"><i className="fas fa-shield-alt"></i> Restricted Access</a>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} DomusEA | Developed by <a href="#">Elizon Tech</a>
          </p>
        </div>
      </footer>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}

// Root Component
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}