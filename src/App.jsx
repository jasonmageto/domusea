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

// --- LOGIN SCREEN ---
const LoginScreen = ({ isDark, toggleTheme }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      else setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (error === 'FROZEN_TENANT' || error === 'FROZEN_ADMIN') {
    return (
      <div className="frozen-container">
        <div className="frozen-card animate-fadeIn">
          <span className="frozen-icon" role="img" aria-label="Account frozen">
            {error === 'FROZEN_TENANT' ? '' : '🔒'}
          </span>
          <h2 className="frozen-title">
            {error === 'FROZEN_TENANT' ? 'Account Temporarily Unavailable' : 'Subscription Expired'}
          </h2>
          <p className="frozen-text">
            {error === 'FROZEN_TENANT' 
              ? "Your property manager's account is currently inactive. Please contact your administrator." 
              : "Your account has been frozen due to an overdue subscription. Renew to restore access."}
          </p>
          <div className="frozen-contact">
            <strong>📞 Contact Support to Renew:</strong>
            <span>Phone: 0711 333 436</span>
            <span>Email: sa@domusea.com</span>
          </div>
          <div className="frozen-buttons">
            <button 
              onClick={() => window.location.href = 'tel:0711333436'} 
              className="btn btn-primary btn-full"
            >
              <i className="fas fa-phone"></i> Call Now
            </button>
            <button 
              onClick={() => { setError(''); setEmail(''); setPassword(''); }} 
              className="btn btn-secondary btn-full"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="theme-toggle"
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
      </button>
      
      <div className="login-card animate-fadeIn">
        {/* Left Panel - Branding */}
        <div className="login-left">
          <div className="login-quote-header">A WISE QUOTE</div>
          <h1 className="login-main-quote">Build Better.<br/>Manage Smarter.</h1>
          <p className="login-quote-text">
            "The art of building is not just about structures; it's about creating spaces where communities thrive. DomusEA handles the details so you can focus on the home."
          </p>
          <div className="login-branding">
            <div className="login-logo"> DomusEA</div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>Property Management Redefined</div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="login-right">
          <div>
            <h2 className="login-welcome-title">Welcome Back</h2>
            <p className="login-welcome-subtitle">Enter your credentials to access your account</p>

            <form className="login-form" onSubmit={handleLogin} noValidate>
              {error && (
                <div className="login-error" role="alert">
                  <i className="fas fa-exclamation-circle"></i> {error}
                </div>
              )}
              
              <div className="login-input-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">
                    <i className="fas fa-envelope"></i>
                  </span>
                  <input 
                    id="email"
                    type="email" 
                    placeholder="name@company.com" 
                    className="login-input" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    autoComplete="email"
                    aria-required="true"
                  />
                </div>
              </div>
              
              <div className="login-input-group">
                <label htmlFor="password" className="form-label">Password</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">
                    <i className="fas fa-lock"></i>
                  </span>
                  <input 
                    id="password"
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    className="login-input" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    autoComplete="current-password"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn btn-ghost btn-sm"
                    style={{ 
                      position: 'absolute', 
                      right: '0.5rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      padding: '0.25rem 0.5rem'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                  </button>
                </div>
              </div>
              
              <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
                {loading ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i> Signing In...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i> Sign In
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              <div className="login-footer-links">
                <a href="tel:0711333436" className="transition">
                  <i className="fas fa-phone"></i> Call Support
                </a>
                <a href="https://wa.me/254711333436" target="_blank" rel="noopener noreferrer" className="transition">
                  <i className="fab fa-whatsapp"></i> WhatsApp
                </a>
              </div>
              <div className="login-footer-credit">
                Developed by <a href="https://elizontech.com" target="_blank" rel="noopener noreferrer">Elizon Tech</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUBSCRIPTION EXPIRED SCREEN ---
const SubscriptionExpired = ({ userProfile, logout }) => (
  <div className="frozen-container">
    <div className="frozen-card animate-fadeIn">
      <span className="frozen-icon" role="img" aria-label="Locked">🔒</span>
      <h1 className="frozen-title">Subscription Overdue</h1>
      <p className="frozen-text">
        Your account has been frozen due to an overdue subscription. Please renew to regain full access to your properties and tenant management features.
      </p>
      <div className="frozen-contact">
        <strong>Account Details</strong>
        <span><i className="fas fa-user"></i> {userProfile?.name}</span>
        <span><i className="fas fa-money-bill"></i> KSh {userProfile?.subscription_fee?.toLocaleString() || '0'} Due</span>
        {userProfile?.subscription_due && (
          <span><i className="fas fa-calendar"></i> Due Date: {userProfile.subscription_due}</span>
        )}
      </div>
      <div className="frozen-buttons">
        <button 
          onClick={() => window.location.href = 'tel:0711333436'} 
          className="btn btn-primary btn-full btn-lg"
        >
          <i className="fas fa-phone"></i> Call Support to Renew
        </button>
        <button onClick={logout} className="btn btn-secondary btn-full">
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  </div>
);

// --- APP CONTENT ROUTER ---
const AppContent = ({ userProfile, activeTab }) => {
  const roles = {
    supreme_admin: {
      dashboard: <SADashboard />,
      'property-moderation': <PropertyModeration />,
      'property-map': <PropertyMap />,
      'property-search': <PropertySearch />,
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
      'property-search': <PropertySearch adminId={userProfile?.id} />,
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
  
  const userRole = userProfile?.role;
  const content = roles[userRole]?.[activeTab] || roles[userRole]?.dashboard;
  
  return content || (
    <div className="card flex items-center justify-center" style={{ minHeight: '300px' }}>
      <div className="text-center">
        <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
        <h3 className="text-xl font-bold mb-2">Page Not Found</h3>
        <p className="text-muted">The page you're looking for doesn't exist or you don't have permission to view it.</p>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  const { userProfile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem('domusea-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (saved === 'dark' || (!saved && prefersDark)) {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDark(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('domusea-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('domusea-theme', 'light');
    }
  }, [isDark]);

  // Toggle theme function
  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobileMenuOpen && !e.target.closest('.nav-menu') && !e.target.closest('.hamburger')) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="animate-pulse" style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏠</div>
          <div className="text-xl font-semibold" style={{ color: 'white' }}>Loading DomusEA...</div>
          <div className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.8)' }}>Secure Property Management Platform</div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!userProfile) {
    return <LoginScreen isDark={isDark} toggleTheme={toggleTheme} />;
  }

  // Admin with overdue subscription
  if (userProfile.role === 'admin' && userProfile.subscription_status === 'Overdue') {
    return <SubscriptionExpired userProfile={userProfile} logout={logout} />;
  }

  // Role-based navigation items
  const menuItems = {
    supreme_admin: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
      { id: 'property-moderation', label: 'Moderation', icon: 'fas fa-shield-alt' },
      { id: 'property-map', label: 'Property Map', icon: 'fas fa-map-marked-alt' },
      { id: 'property-search', label: 'Search', icon: 'fas fa-search' },
      { id: 'manage-admins', label: 'Manage Admins', icon: 'fas fa-users-cog' },
      { id: 'sa-subscriptions', label: 'Subscriptions', icon: 'fas fa-credit-card' },
      { id: 'sa-revenue', label: 'Revenue Analytics', icon: 'fas fa-chart-bar' },
      { id: 'sa-payments', label: 'Payment Records', icon: 'fas fa-money-bill-wave' },
      { id: 'sa-announcements', label: 'Announcements', icon: 'fas fa-bullhorn' },
      { id: 'messages', label: 'Messages', icon: 'fas fa-comments' }
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home' },
      { id: 'add-property', label: 'Add Property', icon: 'fas fa-plus-circle' },
      { id: 'property-map', label: 'Property Map', icon: 'fas fa-map-marked-alt' },
      { id: 'property-search', label: 'Search', icon: 'fas fa-search' },
      { id: 'manage-tenants', label: 'Manage Tenants', icon: 'fas fa-users' },
      { id: 'occupancy', label: 'Occupancy Grid', icon: 'fas fa-th-large' },
      { id: 'admin-payments', label: 'Payment Records', icon: 'fas fa-money-bill-wave' },
      { id: 'admin-revenue', label: 'Revenue Analytics', icon: 'fas fa-chart-bar' },
      { id: 'complaints', label: 'Requests & Complaints', icon: 'fas fa-inbox' },
      { id: 'messages', label: 'Messages', icon: 'fas fa-comments' }
    ],
    tenant: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home' },
      { id: 'pay-rent', label: 'Pay Rent', icon: 'fas fa-credit-card' },
      { id: 'payment-history', label: 'Payment History', icon: 'fas fa-history' },
      { id: 'tenant-requests', label: 'Submit Request', icon: 'fas fa-inbox' },
      { id: 'messages', label: 'Messages', icon: 'fas fa-comments' },
      { id: 'settings', label: 'Account Settings', icon: 'fas fa-cog' }
    ]
  };

  const currentMenu = menuItems[userProfile?.role] || [];
  const userRole = userProfile?.role?.replace('_', ' ');

  return (
    <div className={`app-wrapper ${isDark ? 'dark' : ''}`}>
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-lg z-50">
        Skip to main content
      </a>

      {/* Navigation Bar */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="nav-container">
          {/* Brand */}
          <a 
            href="#" 
            className="brand" 
            onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}
            aria-label="DomusEA Home"
          >
            <span className="brand-icon">
              <i className="fas fa-building"></i>
            </span>
            <span>DomusEA</span>
          </a>
          
          {/* Navigation Menu */}
          <ul 
            className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`} 
            id="navMenu"
            role="menubar"
          >
            {currentMenu.map(item => (
              <li key={item.id} role="none">
                <a 
                  href="#" 
                  className={activeTab === item.id ? 'active' : ''} 
                  onClick={(e) => { e.preventDefault(); setActiveTab(item.id); }}
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
            </button>

            {/* User Info */}
            <div className="user-info" title={`${userProfile?.name} • ${userRole}`}>
              <div className="user-avatar" aria-hidden="true">
                {userProfile?.name?.charAt(0)}{userProfile?.name?.split(' ')?.[1]?.charAt(0) || ''}
              </div>
              <div className="user-details">
                <div className="user-name">{userProfile?.name}</div>
                <div className="user-role">{userRole}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button 
              onClick={logout} 
              className="btn btn-danger" 
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

      {/* Main Content Area */}
      <main id="main-content" className="main-content" role="main">
        <AppContent userProfile={userProfile} activeTab={activeTab} />
      </main>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-links">
            <a href="tel:0711333436" className="transition">
              <i className="fas fa-phone"></i> 
              <span>0711 333 436</span>
            </a>
            <a href="https://wa.me/254711333436" target="_blank" rel="noopener noreferrer" className="transition">
              <i className="fab fa-whatsapp"></i> WhatsApp
            </a>
            <a href="#" className="transition">
              <i className="fas fa-shield-alt"></i> Restricted Access
            </a>
            <a href="#" className="transition">
              <i className="fas fa-question-circle"></i> Help Center
            </a>
          </div>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} DomusEA. All rights reserved. | Developed by <a href="https://elizontech.com" target="_blank" rel="noopener noreferrer">Elizon Tech</a>
          </p>
        </div>
      </footer>

      {/* Mobile overlay for menu */}
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

// --- ROOT EXPORT WITH AUTH PROVIDER ---
export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}