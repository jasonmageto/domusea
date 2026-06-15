import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import './styles/global.css';
import { supabase } from './supabaseClient';
import { Toaster } from 'react-hot-toast';

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
import DownloadAppButton from './components/DownloadAppButton';

// ==========================================
// SUBSCRIPTION EXPIRED COMPONENT
// ==========================================
const SubscriptionExpired = ({ userProfile, logout }) => {
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    if (paymentStatus === 'processing' && userProfile?.id) {
      const checkInterval = setInterval(async () => {
        try {
          const { data: adminData, error } = await supabase
            .from('admins')
            .select('subscription_status')
            .eq('id', userProfile.id)
            .single();

          if (error) throw error;

          if (adminData?.subscription_status === 'Active') {
            clearInterval(checkInterval);
            setPaymentStatus('success');
            localStorage.removeItem('domusea-user');
            localStorage.removeItem('domusea-token');
            localStorage.removeItem('domusea-session-ts');
            setTimeout(() => window.location.reload(), 2000);
          }
        } catch (err) {
          console.error('Error checking payment status:', err);
        }
      }, 3000);

      return () => clearInterval(checkInterval);
    }
  }, [paymentStatus, userProfile?.id]);

  const handlePayment = async () => {
    setPaying(true);
    setPaymentStatus('processing');
    setPaymentError(null);
    try {
      const { error: insertError } = await supabase
        .from('admin_to_sa_payments')
        .insert({
          admin_id: userProfile.id,
          amount: userProfile.subscription_fee || 2500,
          status: 'Pending',
          payment_method: 'M-Pesa',
          date: new Date().toISOString(),
          description: `Subscription renewal - ${userProfile.subscription_plan || 'Monthly'}`
        })
        .select()
        .single();

      if (insertError) throw insertError;
      alert(`STK Push sent to your phone!\n\nAmount: KSh ${userProfile.subscription_fee?.toLocaleString() || '2,500'}\n\nPlease complete the payment on your phone.`);
    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentStatus('error');
      setPaymentError(error.message);
      alert('Failed to initiate payment. Please try again or contact support.');
    } finally {
      setPaying(false);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Force logout initiated');
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    window.location.replace('/');
    setTimeout(() => { window.location.href = '/'; }, 500);
  };

  return (
    <div className="frozen-container">
      <div className="frozen-card animate-fadeIn" style={{ maxWidth: '520px' }}>
        <span className="frozen-icon">🔒</span>
        <h1 className="frozen-title">Subscription Overdue</h1>
        <p className="frozen-text">Your account has been frozen due to an overdue subscription.</p>
        
        <div className="frozen-contact" style={{ textAlign: 'left' }}>
          <strong style={{ display: 'block', marginBottom: '8px', fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}>Account Details</strong>
          <div style={{ padding: '12px', background: 'var(--bg-faint)', borderRadius: '6px' }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: 'var(--text-muted)', marginBottom: '2px' }}>Name</div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)' }}>{userProfile?.name || 'N/A'}</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: 'var(--text-muted)', marginBottom: '2px' }}>Email</div>
              <div style={{ fontSize: 'clamp(0.875rem, 2.25vw, 0.9375rem)', color: 'var(--text-secondary)' }}>{userProfile?.email || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: 'var(--text-muted)', marginBottom: '2px' }}>Amount Due</div>
              <div style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: '700', color: 'var(--danger)' }}>
                KSh {userProfile?.subscription_fee?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        </div>

        {paymentStatus === 'success' && (
          <div style={{ padding: '16px', background: 'var(--success-bg)', border: '2px solid var(--success)', borderRadius: '12px', marginBottom: '16px', color: 'var(--success-dark)', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', marginBottom: '8px' }}>✅</div>
            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)' }}>Payment Detected!</div>
            <div style={{ fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)' }}>Redirecting to dashboard...</div>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div style={{ padding: '16px', background: 'var(--danger-bg)', border: '2px solid var(--danger)', borderRadius: '12px', marginBottom: '16px', color: 'var(--danger-dark)', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', marginBottom: '8px' }}>❌</div>
            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)' }}>Payment Failed</div>
            <div style={{ fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)' }}>{paymentError || 'Please try again'}</div>
          </div>
        )}

        <div className="frozen-buttons" style={{ gap: '12px' }}>
          <button onClick={handlePayment} disabled={paying || paymentStatus === 'success'} className="btn btn-primary btn-full" style={{ 
            padding: 'clamp(0.875rem, 3vw, 1rem) clamp(1rem, 3.5vw, 1.25rem)', 
            fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)',
            opacity: paying || paymentStatus === 'success' ? 0.7 : 1, 
            cursor: paying || paymentStatus === 'success' ? 'not-allowed' : 'pointer' 
          }}>
            {paying ? (
              <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Processing...</>
            ) : paymentStatus === 'success' ? (
              <><i className="fas fa-check" style={{ marginRight: '8px' }}></i>Payment Received</>
            ) : (
              <><i className="fas fa-credit-card" style={{ marginRight: '8px' }}></i>Pay Subscription Now</>
            )}
          </button>
          
          <button onClick={() => window.location.href = 'tel:0711333436'} className="btn btn-secondary btn-full" disabled={paymentStatus === 'processing'} style={{ padding: 'clamp(0.75rem, 2.5vw, 0.875rem) clamp(1rem, 3vw, 1.125rem)' }}>
            <i className="fas fa-phone" style={{ marginRight: '8px' }}></i>Call Support
          </button>
          
          <button onClick={handleLogout} className="btn btn-ghost btn-full" disabled={paymentStatus === 'processing'} style={{ 
            padding: 'clamp(0.75rem, 2.5vw, 0.875rem) clamp(1rem, 3vw, 1.125rem)',
            cursor: paymentStatus === 'processing' ? 'not-allowed' : 'pointer' 
          }}>
            <i className="fas fa-sign-out-alt"></i>
            <span className="hide-mobile">Logout</span>
          </button>
        </div>

        {paymentStatus === 'processing' && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-faint)', borderRadius: '8px', textAlign: 'center', border: '1px dashed var(--border-primary)' }}>
            <div style={{ fontSize: 'clamp(1.5rem, 5vw, 1.75rem)', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)' }}>Waiting for Payment...</div>
            <div style={{ fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)', color: 'var(--text-muted)' }}>Please complete the payment on your phone.<br/>We'll automatically redirect you once confirmed.</div>
            <div style={{ marginTop: '12px', fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: 'var(--text-muted)' }}>
              <i className="fas fa-clock" style={{ marginRight: '6px' }}></i>Checking every 3 seconds...
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px', padding: '12px', background: 'var(--info-bg)', borderRadius: '8px', fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: 'var(--info)', textAlign: 'center', border: '1px solid var(--info)' }}>
          <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
          After payment, your account will be reactivated automatically within 30 seconds.
        </div>
      </div>
    </div>
  );
};

// ==========================================
// UPDATE PROMPT COMPONENT
// ==========================================
const UpdatePrompt = ({ onRefresh }) => {
  const [updating, setUpdating] = useState(false);

  const handleRefresh = async () => {
    setUpdating(true);
    try { await onRefresh(); } catch (error) { console.error('Update error:', error); setUpdating(false); }
  };

  const handleDismiss = () => {
    localStorage.setItem('domusea-update-dismissed', 'true');
    const prompt = document.querySelector('.update-prompt-wrapper');
    if (prompt) prompt.style.display = 'none';
  };

  return (
    <div className="fixed bottom-4 right-4 z-[1200] animate-fadeIn update-prompt-wrapper">
      <div className="card p-4 shadow-lg border border-primary" style={{ maxWidth: 320 }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🔄</span>
          <div>
            <h4 className="font-semibold text-primary" style={{ fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)' }}>Update Available</h4>
            <p className="text-sm text-muted" style={{ fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)' }}>A new version is ready</p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={updating} className="btn btn-primary btn-sm w-full" style={{ 
          opacity: updating ? 0.7 : 1, 
          cursor: updating ? 'not-allowed' : 'pointer',
          fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)'
        }}>
          {updating ? (
            <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Updating...</>
          ) : (
            <><i className="fas fa-sync" style={{ marginRight: 8 }}></i>Refresh Now</>
          )}
        </button>
        <button onClick={handleDismiss} className="btn btn-ghost btn-sm w-full mt-2" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)' }}>Remind me later</button>
      </div>
    </div>
  );
};

// ==========================================
// VIEW TOGGLE COMPONENT
// ==========================================
const ViewToggle = ({ isDesktopView, onToggle }) => (
  <button
    onClick={onToggle}
    className="btn btn-sm view-toggle-btn"
    title={isDesktopView ? 'Switch to Mobile View' : 'Switch to Desktop View'}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: 'clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.75rem, 2.5vw, 0.875rem)',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--border-primary)',
      background: 'var(--bg-faint)',
      color: 'var(--text-secondary)',
      fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)',
      fontWeight: 600,
      transition: 'var(--transition)',
      whiteSpace: 'nowrap',
      minWidth: '44px',
      minHeight: '44px'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'var(--primary)';
      e.currentTarget.style.color = '#fff';
      e.currentTarget.style.borderColor = 'var(--primary)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'var(--bg-faint)';
      e.currentTarget.style.color = 'var(--text-secondary)';
      e.currentTarget.style.borderColor = 'var(--border-primary)';
    }}
  >
    <i className={`fas ${isDesktopView ? 'fa-mobile-alt' : 'fa-desktop'}`} style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}></i>
    <span className="hide-mobile">{isDesktopView ? 'Mobile' : 'Desktop'}</span>
  </button>
);

// ==========================================
// MAIN APP CONTENT
// ==========================================
function AppContent() {
  const { userProfile, loading, logout, error, refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  const [isDesktopView, setIsDesktopView] = useState(() => {
    const saved = localStorage.getItem('domusea-view-mode');
    return saved === 'desktop';
  });

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('domusea-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleViewMode = () => {
    const newMode = !isDesktopView;
    setIsDesktopView(newMode);
    localStorage.setItem('domusea-view-mode', newMode ? 'desktop' : 'auto');
    
    if (newMode) {
      document.body.style.minWidth = '1024px';
      document.body.style.overflowX = 'auto';
    } else {
      document.body.style.minWidth = '';
      document.body.style.overflowX = '';
    }
  };

  const toggleTheme = () => setIsDark(prev => !prev);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setActiveTab('dashboard');
  }, [userProfile?.role]);

  useEffect(() => {
    if (localStorage.getItem('domusea-update-dismissed') === 'true') {
      return;
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 New service worker activated');
        setUpdateAvailable(true);
      });

      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          console.log('⏳ Waiting service worker found');
          setUpdateAvailable(true);
        }
      });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userProfile) {
        // Optional: refresh auth when tab becomes visible
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userProfile]);

  const handleUpdateRefresh = async () => {
    console.log('🔄 Starting update process...');
    setUpdateAvailable(false);
    
    if ('serviceWorker' in navigator) {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }
        
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration?.waiting) {
          console.log('⏳ Found waiting service worker');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          const timeout = new Promise(resolve => setTimeout(resolve, 5000));
          const activated = new Promise(resolve => {
            registration.waiting?.addEventListener('statechange', (e) => {
              if (e.target.state === 'activated') resolve();
            });
          });
          
          await Promise.race([activated, timeout]);
        }
      } catch (error) {
        console.error('❌ Service worker update error:', error);
      }
    }
    
    console.log('🔄 Force reloading...');
    window.location.href = window.location.href;
  };

  useEffect(() => {
    if (error && !loading) {
      console.warn('⚠️ Auth error detected:', error);
      
      if (error.includes('expired') || error.includes('invalid')) {
        console.log('🔄 Attempting auth recovery...');
        refreshAuth();
      }
    }
  }, [error, loading, refreshAuth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted text-lg font-medium" style={{ fontSize: 'clamp(1rem, 3vw, 1.125rem)' }}>Loading DomusEA...</p>
          <p className="text-muted text-sm mt-2" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)' }}>Secure Property Management Platform</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <LoginScreen isDark={isDark} toggleTheme={toggleTheme} error={error} />;
  }

  if (userProfile.role === 'admin' && userProfile.subscription_status === 'Overdue') {
    return <SubscriptionExpired userProfile={userProfile} logout={logout} />;
  }

  const getMenuItems = () => {
    const role = userProfile.role;
    
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

  const renderContent = () => {
    const role = userProfile.role;
    
    console.log('🎯 [APP] Rendering for role:', role, '| Tab:', activeTab);
    
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
    
    console.error('❌ [APP] Unknown role:', role);
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center max-w-md">
          <div className="text-5xl mb-4" style={{ fontSize: 'clamp(2.5rem, 8vw, 3rem)' }}>⚠️</div>
          <h2 className="text-xl font-bold text-danger mb-2" style={{ fontSize: 'clamp(1.125rem, 3.5vw, 1.25rem)' }}>Unknown Role</h2>
          <p className="text-muted mb-6" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)' }}>
            Your role <code className="px-2 py-1 bg-faint rounded text-sm" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)' }}>"{role}"</code> is not recognized.
            Please contact support to resolve this issue.
          </p>
          <div className="flex gap-3" style={{ flexDirection: 'column' }}>
            <button onClick={logout} className="btn btn-primary btn-full" style={{ fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)' }}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
            <button onClick={() => window.location.href = 'tel:0711333436'} className="btn btn-secondary btn-full" style={{ fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)' }}>
              <i className="fas fa-phone"></i> Call Support
            </button>
          </div>
        </div>
      </div>
    );
  };

  const menuItems = getMenuItems();
  const userRole = userProfile.role?.replace('_', ' ') || 'Unknown';

  return (
    <div className={`app-wrapper ${isDark ? 'dark' : ''} ${isDesktopView ? 'force-desktop-view' : ''}`}>
      <Toaster 
        position="top-right"
        gutter={12}
        containerStyle={{ margin: '8px' }}
        toastOptions={{
          duration: 4000,
          success: { 
            iconTheme: { primary: '#10B981', secondary: '#fff' },
            style: {
              background: '#fff',
              color: '#1F2937',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #E5E7EB',
              fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
              fontWeight: '600',
              padding: 'clamp(0.875rem, 2.5vw, 1rem) clamp(1rem, 3vw, 1.25rem)'
            }
          },
          error: { 
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
            style: {
              background: '#fff',
              color: '#1F2937',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #FCA5A5',
              fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
              fontWeight: '600',
              padding: 'clamp(0.875rem, 2.5vw, 1rem) clamp(1rem, 3vw, 1.25rem)'
            }
          },
          loading: {
            style: {
              background: '#fff',
              color: '#1F2937',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #93C5FD',
              fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
              fontWeight: '600',
              padding: 'clamp(0.875rem, 2.5vw, 1rem) clamp(1rem, 3vw, 1.25rem)'
            }
          }
        }}
      />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-lg z-50"
        style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)' }}
      >
        Skip to main content
      </a>

      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="nav-container" style={{ padding: '0 16px' }}>
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

          <div className="nav-actions">
            <DownloadAppButton />
            <ViewToggle isDesktopView={isDesktopView} onToggle={toggleViewMode} />

            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title="Toggle theme"
              style={{ fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)' }}
            >
              <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
              <span className="hide-mobile">{isDark ? 'Light' : 'Dark'}</span>
            </button>

            <div
              className="user-info"
              title={`${userProfile?.name} • ${userRole}`}
              role="button"
              tabIndex={0}
            >
              <div className="user-avatar" aria-hidden="true" style={{ 
                fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)',
                width: 'clamp(2rem, 6vw, 2.25rem)',
                height: 'clamp(2rem, 6vw, 2.25rem)'
              }}>
                {userProfile?.name?.charAt(0).toUpperCase()}
                {userProfile?.name?.split(' ')?.[1]?.charAt(0).toUpperCase() || ''}
              </div>
              <div className="user-details hide-mobile">
                <div className="user-name" style={{ fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)' }}>{userProfile?.name}</div>
                <div className="user-role" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>{userRole}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-danger btn-sm"
              title="Logout"
              aria-label="Logout from your account"
              style={{ 
                fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', 
                padding: 'clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 2.5vw, 0.875rem)' 
              }}
            >
              <i className="fas fa-sign-out-alt"></i>
              <span className="hide-mobile">Logout</span>
            </button>

            <button
              className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="navMenu"
              style={{ width: 'clamp(2.5rem, 7vw, 2.75rem)', height: 'clamp(2.5rem, 7vw, 2.75rem)' }}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      <main id="main-content" className="main-content" role="main">
        {renderContent()}
      </main>

      <footer className="footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-links">
            <a href="tel:0711333436" style={{ fontSize: 'clamp(0.8125rem, 2.5vw, 0.9375rem)' }}>
              <i className="fas fa-phone"></i>
              <span>0711 333 436</span>
            </a>
            <a
              href="https://wa.me/254711333436"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 'clamp(0.8125rem, 2.5vw, 0.9375rem)' }}
            >
              <i className="fab fa-whatsapp"></i>
              <span>WhatsApp</span>
            </a>
            <a href="#" style={{ fontSize: 'clamp(0.8125rem, 2.5vw, 0.9375rem)' }}>
              <i className="fas fa-shield-alt"></i>
              <span>Restricted Access</span>
            </a>
          </div>
          <p className="footer-copyright" style={{ fontSize: 'clamp(0.75rem, 2.25vw, 0.8125rem)', marginTop: 'clamp(0.75rem, 2vw, 1rem)' }}>
            © {new Date().getFullYear()} DomusEA. All rights reserved. |
            Developed by{' '}
            <a
              href="https://elizontech.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 'inherit' }}
            >
              Elizon Tech
            </a>
          </p>
        </div>
      </footer>

      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {updateAvailable && <UpdatePrompt onRefresh={handleUpdateRefresh} />}
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