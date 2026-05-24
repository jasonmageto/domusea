import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import './styles/global.css';

// ==========================================
// COMPONENT IMPORTS - SUPREME ADMIN
// ==========================================
import SADashboard from './components/SADashboard';
import ManageAdmins from './components/ManageAdmins';
import PropertyModeration from './components/PropertyModeration';
import SASubscriptions from './components/SASubscriptions';
import SARevenueAnalytics from './components/SARevenueAnalytics';
import SAPayments from './components/SAPayments';
import SAAnnouncements from './components/SAAnnouncements';
import PropertyMap from './components/PropertyMap';
import Messages from './components/Messages';

// ==========================================
// COMPONENT IMPORTS - PROPERTY ADMIN
// ==========================================
import PropertyAdminDashboard from './components/PropertyAdminDashboard';
import AddPropertyForm from './components/AddPropertyForm';
import ManageTenants from './components/ManageTenants';
import OccupancyGrid from './components/OccupancyGrid';
import AdminPaymentsManager from './components/AdminPaymentsManager';
import AdminRevenueAnalytics from './components/AdminRevenueAnalytics';
import ComplaintsManager from './components/ComplaintsManager';

// ==========================================
// COMPONENT IMPORTS - TENANT
// ==========================================
import TenantDashboard from './components/TenantDashboard';
import TenantPayRent from './components/TenantPayRent';
import TenantPaymentHistory from './components/TenantPaymentHistory';
import TenantRequests from './components/TenantRequests';
import TenantSettings from './components/TenantSettings';

// ==========================================
// COMPONENT IMPORTS - AUTH & UI
// ==========================================
import LoginScreen from './components/LoginScreen';

// ==========================================
// SUBSCRIPTION EXPIRED COMPONENT
// ==========================================
const SubscriptionExpired = ({ userProfile, logout }) => (
  <div className="frozen-container">
    <div className="frozen-card animate-fadeIn">
      <span className="frozen-icon">🔒</span>
      <h1 className="frozen-title">Subscription Overdue</h1>
      <p className="frozen-text">
        Your account has been frozen due to an overdue subscription.
      </p>
      <div className="frozen-contact">
        <strong>Account Details</strong>
        <span>{userProfile?.name || 'N/A'}</span>
        <span>KSh {userProfile?.subscription_fee?.toLocaleString() || '0'} Due</span>
      </div>
      <div className="frozen-buttons">
        <button
          onClick={() => window.location.href = 'tel:0711333436'}
          className="btn btn-primary btn-full"
        >
          📞 Call Support to Renew
        </button>
        <button onClick={logout} className="btn btn-secondary btn-full">
          Logout
        </button>
      </div>
    </div>
  </div>
);

// ==========================================
// MAIN APP CONTENT
// ==========================================
function AppContent() {
  const { userProfile, loading, logout, error } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('domusea-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDark(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('domusea-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Toggle theme
  const toggleTheme = () => setIsDark(prev => !prev);

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

  // Reset active tab when role changes
  useEffect(() => {
    setActiveTab('dashboard');
  }, [userProfile?.role]);

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted text-lg font-medium">Loading DomusEA...</p>
          <p className="text-muted text-sm mt-2">Secure Property Management Platform</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // NOT AUTHENTICATED
  // ==========================================
  if (!userProfile) {
    return <LoginScreen isDark={isDark} toggleTheme={toggleTheme} error={error} />;
  }

  // ==========================================
  // SUBSCRIPTION EXPIRED (Admin Only)
  // ==========================================
  if (userProfile.role === 'admin' && userProfile.subscription_status === 'Overdue') {
    return <SubscriptionExpired userProfile={userProfile} logout={logout} />;
  }

  // ==========================================
  // ROLE-BASED MENU CONFIGURATION
  // ==========================================
  const getMenuItems = () => {
    const role = userProfile.role;
    
    // Supreme Admin
    if (role === 'supreme_admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
        { id: 'property-moderation', label: 'Moderation', icon: 'fas fa-shield-alt' },
        { id: 'property-map', label: 'Map', icon: 'fas fa-map-marked-alt' },
        { id: 'manage-admins', label: 'Admins', icon: 'fas fa-users-cog' },
        { id: 'sa-subscriptions', label: 'Subscriptions', icon: 'fas fa-credit-card' },
        { id: 'sa-revenue', label: 'Revenue', icon: 'fas fa-chart-bar' },
        { id: 'sa-payments', label: 'Payments', icon: 'fas fa-money-bill-wave' },
        { id: 'sa-announcements', label: 'Announcements', icon: 'fas fa-bullhorn' },
        { id: 'messages', label: 'Messages', icon: 'fas fa-comments' }
      ];
    }
    
    // Property Admin
    if (role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home' },
        { id: 'add-property', label: 'Add Property', icon: 'fas fa-plus-circle' },
        { id: 'property-map', label: 'Map', icon: 'fas fa-map-marked-alt' },
        { id: 'manage-tenants', label: 'Tenants', icon: 'fas fa-users' },
        { id: 'occupancy', label: 'Occupancy', icon: 'fas fa-th-large' },
        { id: 'admin-payments', label: 'Payments', icon: 'fas fa-money-bill-wave' },
        { id: 'admin-revenue', label: 'Analytics', icon: 'fas fa-chart-bar' },
        { id: 'complaints', label: 'Requests', icon: 'fas fa-inbox' },
        { id: 'messages', label: 'Messages', icon: 'fas fa-comments' }
      ];
    }
    
    // Tenant
    if (role === 'tenant') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home' },
        { id: 'pay-rent', label: 'Pay Rent', icon: 'fas fa-credit-card' },
        { id: 'payment-history', label: 'History', icon: 'fas fa-history' },
        { id: 'tenant-requests', label: 'Requests', icon: 'fas fa-inbox' },
        { id: 'messages', label: 'Messages', icon: 'fas fa-comments' },
        { id: 'settings', label: 'Settings', icon: 'fas fa-cog' }
      ];
    }
    
    return [];
  };

  // ==========================================
  // ROLE-BASED COMPONENT RENDERING (STRICT)
  // ==========================================
  const renderContent = () => {
    const role = userProfile.role;
    
    console.log('🎯 [APP] Rendering for role:', role, '| Tab:', activeTab);
    
    // ==========================================
    // SUPREME ADMIN ROUTING (EXCLUSIVE)
    // ==========================================
    if (role === 'supreme_admin') {
      console.log('✅ Routing to Supreme Admin Dashboard');
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
    
    // ==========================================
    // PROPERTY ADMIN ROUTING (EXCLUSIVE)
    // ==========================================
    if (role === 'admin') {
      console.log('✅ Routing to Property Admin Dashboard');
      switch (activeTab) {
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
    
    // ==========================================
    // TENANT ROUTING (EXCLUSIVE)
    // ==========================================
    if (role === 'tenant') {
      console.log('✅ Routing to Tenant Dashboard');
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
    
    // ==========================================
    // FALLBACK - UNKNOWN ROLE
    // ==========================================
    console.error('❌ [APP] Unknown role:', role);
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-danger mb-2">Unknown Role</h2>
          <p className="text-muted mb-6">
            Your role <code className="px-2 py-1 bg-faint rounded text-sm">"{role}"</code> is not recognized.
            Please contact support to resolve this issue.
          </p>
          <div className="flex gap-3">
            <button onClick={logout} className="btn btn-primary flex-1">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
            <button
              onClick={() => window.location.href = 'tel:0711333436'}
              className="btn btn-secondary flex-1"
            >
              <i className="fas fa-phone"></i> Call Support
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER APP
  // ==========================================
  const menuItems = getMenuItems();
  const userRole = userProfile.role?.replace('_', ' ') || 'Unknown';

  return (
    <div className={`app-wrapper ${isDark ? 'dark' : ''}`}>
      {/* Skip to content for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-lg z-50"
      >
        Skip to main content
      </a>

      {/* ========================================== */}
      {/* NAVIGATION BAR                               */}
      {/* ========================================== */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="nav-container">
          {/* Brand */}
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
            }}
            aria-label="DomusEA Home"
          >
            <i className="fas fa-building"></i>
            <span>DomusEA</span>
          </a>

          {/* Navigation Menu */}
          <ul
            className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}
            id="navMenu"
            role="menubar"
          >
            {menuItems.map((item) => (
              <li key={item.id} role="none">
                <a
                  href="#"
                  className={activeTab === item.id ? 'active' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  role="menuitem"
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  <i className={item.icon} aria-hidden="true"></i>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {/* Right Actions */}
          <div className="nav-actions">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title="Toggle theme"
            >
              <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
              <span className="hide-mobile">{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* User Info */}
            <div
              className="user-info"
              title={`${userProfile?.name} • ${userRole}`}
              role="button"
              tabIndex={0}
            >
              <div className="user-avatar" aria-hidden="true">
                {userProfile?.name?.charAt(0).toUpperCase()}
                {userProfile?.name?.split(' ')?.[1]?.charAt(0).toUpperCase() || ''}
              </div>
              <div className="user-details hide-mobile">
                <div className="user-name">{userProfile?.name}</div>
                <div className="user-role">{userRole}</div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="btn btn-danger btn-sm"
              title="Logout"
              aria-label="Logout from your account"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span className="hide-mobile">Logout</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="navMenu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* ========================================== */}
      {/* MAIN CONTENT                                 */}
      {/* ========================================== */}
      <main id="main-content" className="main-content" role="main">
        {renderContent()}
      </main>

      {/* ========================================== */}
      {/* FOOTER                                       */}
      {/* ========================================== */}
      <footer className="footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-links">
            <a href="tel:0711333436">
              <i className="fas fa-phone"></i>
              <span>0711 333 436</span>
            </a>
            <a
              href="https://wa.me/254711333436"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-whatsapp"></i>
              <span>WhatsApp</span>
            </a>
            <a href="#">
              <i className="fas fa-shield-alt"></i>
              <span>Restricted Access</span>
            </a>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} DomusEA. All rights reserved. |
            Developed by{' '}
            <a
              href="https://elizontech.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Elizon Tech
            </a>
          </p>
        </div>
      </footer>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ==========================================
// ROOT EXPORT WITH AUTH PROVIDER
// ==========================================
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}