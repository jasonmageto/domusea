import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast, Toaster } from 'react-hot-toast';

export default function PropertyAdminDashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    subscription: null,
    revenue: { confirmed: 0, pending: 0 },
    occupancy: { total: 0, limit: 50 }
  });
  const [tenants, setTenants] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const handleSubscriptionPayment = async () => {
    setPaying(true);
    try {
      console.log("Initiating payment for admin:", userProfile.id);
      
      // Simulate API call - replace with actual payment integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('✅ STK Push sent! Check your phone to complete payment.');
      setShowModal(false);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('❌ Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (userProfile?.id) {
      fetchDashboardData(userProfile.id);
    }
  }, [userProfile?.id]);

  async function fetchDashboardData(adminId) {
    console.log('🔍 Fetching dashboard for admin:', adminId);
    
    try {
      // 1. Fetch Subscription
      const subResult = await supabase
        .from('admins')
        .select('subscription_plan, subscription_fee, subscription_due, subscription_status, tenant_limit')
        .eq('id', adminId)
        .single();

      const subData = subResult.data;

      // 2. Fetch Tenant Count
      const countResult = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId);

      const count = countResult.count;

      // 3. Fetch Tenant List
      const tenantResult = await supabase
        .from('tenants')
        .select('*')
        .eq('admin_id', adminId)
        .order('house');

      const tenantList = tenantResult.data;

      // 4. Fetch Payments
      const paymentsResult = await supabase
        .from('payments')
        .select('amount, status')
        .eq('admin_id', adminId);

      const payments = paymentsResult.data || [];
      const confirmed = payments.filter(p => p.status === 'Confirmed').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const pending = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

      // 5. Fetch Announcements
      const announcementsResult = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      const announcementsList = announcementsResult.data || [];

      // Update state
      setStats({
        subscription: subData,
        revenue: { confirmed, pending },
        occupancy: { total: count || 0, limit: subData?.tenant_limit || 50 }
      });
      
      setTenants(tenantList || []);
      setAnnouncements(announcementsList);
    } catch (error) {
      console.error('❌ Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper animate-fadeIn" style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: '100%', overflow: 'hidden' }}>
      <Toaster position="top-right" />

      <div className="page-header" style={{ marginBottom: 'clamp(1rem, 3vw, 2rem)' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', margin: 0 }}>
            Property Admin Dashboard
          </h1>
          <p className="page-subtitle" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)', margin: '0.25rem 0 0 0' }}>
            Manage your properties and tenants
          </p>
        </div>
      </div>

      {/* Subscription Info Card - COMPACT */}
      <div className="card mb-6" style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)', padding: 'clamp(0.75rem, 2.5vw, 1rem)' }}>
        <div className="card-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 0 clamp(0.75rem, 2.5vw, 1rem) 0',
          marginBottom: 'clamp(0.75rem, 2.5vw, 1rem)',
          borderBottom: '1px solid var(--border-primary)',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: 'clamp(0.9375rem, 3vw, 1.125rem)' }}>Subscription</h3>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowModal(true)}
            style={{ 
              padding: 'clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 2.5vw, 1rem)',
              fontSize: 'clamp(0.75rem, 2.25vw, 0.875rem)',
              minWidth: '40px',
              minHeight: '40px'
            }}
          >
            💳 Pay
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: 'clamp(0.75rem, 2.5vw, 1rem)' 
          }}>
            <div>
              <p className="text-sm text-muted mb-1" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)', margin: '0 0 0.25rem 0' }}>Plan</p>
              <p className="font-semibold" style={{ fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)', margin: 0 }}>
                {stats.subscription?.subscription_plan || 'N/A'}
              </p>
              <p className="text-xs text-muted mt-1" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)', margin: '0.25rem 0 0 0' }}>
                Status: <span className={`badge ${stats.subscription?.subscription_status === 'Active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 'clamp(0.625rem, 1.75vw, 0.6875rem)' }}>
                  {stats.subscription?.subscription_status || 'N/A'}
                </span>
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted mb-1" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)', margin: '0 0 0.25rem 0' }}>Fee</p>
              <p className="font-bold text-primary" style={{ fontSize: 'clamp(1rem, 3vw, 1.125rem)', margin: 0 }}>
                KSh {stats.subscription?.subscription_fee?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-muted mt-1" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)', margin: '0.25rem 0 0 0' }}>
                Due: {stats.subscription?.subscription_due ? new Date(stats.subscription.subscription_due).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted mb-1" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)', margin: '0 0 0.25rem 0' }}>Tenants</p>
              <p className="font-semibold" style={{ fontSize: 'clamp(0.9375rem, 2.5vw, 1rem)', margin: 0 }}>
                {stats.occupancy.total} / {stats.occupancy.limit}
              </p>
              <p className="text-xs text-muted mt-1" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)', margin: '0.25rem 0 0 0' }}>Units Occupied</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Stats Grid */}
      <div className="stats-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(120px, 30vw, 240px), 1fr))', 
        gap: 'clamp(1rem, 3vw, 1.25rem)', 
        marginBottom: 'clamp(1rem, 3vw, 2rem)' 
      }}>
        <div className="stat-card success">
          <div className="stat-header">
            <div>
              <div className="stat-label" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>Revenue</div>
              <div className="stat-value text-success" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)' }}>
                KSh {stats.revenue.confirmed.toLocaleString()}
              </div>
            </div>
            <div className="stat-icon green">
              <i className="fas fa-wallet"></i>
            </div>
          </div>
          <div className="stat-subtitle" style={{ fontSize: 'clamp(0.75rem, 2.25vw, 0.875rem)' }}>Confirmed payments</div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-header">
            <div>
              <div className="stat-label" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>Pending</div>
              <div className="stat-value text-warning" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)' }}>
                KSh {stats.revenue.pending.toLocaleString()}
              </div>
            </div>
            <div className="stat-icon orange">
              <i className="fas fa-clock"></i>
            </div>
          </div>
          <div className="stat-subtitle" style={{ fontSize: 'clamp(0.75rem, 2.25vw, 0.875rem)' }}>Awaiting confirmation</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>Occupancy</div>
              <div className="stat-value" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)' }}>
                {stats.occupancy.limit > 0 
                  ? Math.round((stats.occupancy.total / stats.occupancy.limit) * 100) 
                  : 0}%
              </div>
            </div>
            <div className="stat-icon blue">
              <i className="fas fa-chart-pie"></i>
            </div>
          </div>
          <div className="stat-subtitle" style={{ fontSize: 'clamp(0.75rem, 2.25vw, 0.875rem)' }}>
            {stats.occupancy.total} of {stats.occupancy.limit} units
          </div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card mb-6" style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: 'clamp(0.9375rem, 3vw, 1.125rem)', margin: 0 }}>📢 Announcements</h3>
          </div>
          <div className="card-body" style={{ padding: 'clamp(0.75rem, 2.5vw, 1rem)' }}>
            <div className="announcement-list" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.75rem, 2.5vw, 1rem)' }}>
              {announcements.map(a => (
                <div key={a.id} className="announcement-item" style={{ 
                  padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                  background: 'var(--bg-faint)',
                  borderRadius: 'var(--radius)',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  <div className="announcement-header" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <span className="announcement-title" style={{ 
                      fontWeight: 600, 
                      color: 'var(--text-primary)',
                      fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)'
                    }}>{a.subject}</span>
                    <span className={`badge ${a.priority === 'High' ? 'badge-danger' : a.priority === 'Medium' ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: 'clamp(0.625rem, 1.75vw, 0.6875rem)' }}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="announcement-text" style={{ 
                    fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)', 
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5
                  }}>{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="card">
        <div className="card-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <h3 className="card-title" style={{ fontSize: 'clamp(0.9375rem, 3vw, 1.125rem)', margin: 0 }}>Your Tenants</h3>
          <span className="text-muted text-sm" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)' }}>{tenants.length} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {tenants.length === 0 ? (
            <div className="text-center py-8 text-muted" style={{ padding: 'clamp(2rem, 5vw, 3rem)' }}>
              <i className="fas fa-users" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '1rem', display: 'block', opacity: 0.5 }}></i>
              <p style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)', margin: 0 }}>No tenants added yet</p>
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', borderRadius: 'var(--radius)' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                fontSize: 'clamp(0.8125rem, 2.5vw, 0.875rem)',
                minWidth: '600px'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                    <th style={{ padding: 'clamp(0.625rem, 2.5vw, 0.875rem)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>Name</th>
                    <th style={{ padding: 'clamp(0.625rem, 2.5vw, 0.875rem)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>House</th>
                    <th style={{ padding: 'clamp(0.625rem, 2.5vw, 0.875rem)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>Rent</th>
                    <th style={{ padding: 'clamp(0.625rem, 2.5vw, 0.875rem)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                      <td style={{ padding: 'clamp(0.625rem, 2.5vw, 0.875rem)', fontWeight: 600, fontSize: 'clamp(0.8125rem, 2.5vw, 0.875rem)' }}>{t.name}</td>
                      <td style={{ padding: 'clamp(0.625rem, 2.5vw, 0.875rem)', color: 'var(--text-muted)', fontSize: 'clamp(0.8125rem, 2.5vw, 0.875rem)' }}>{t.house}</td>
                      <td style={{ padding: 'clamp(0.625rem, 2.5vw, 0.875rem)', fontWeight: 700, fontSize: 'clamp(0.8125rem, 2.5vw, 0.875rem)' }}>KSh {t.rent?.toLocaleString()}</td>
                      <td style={{ padding: 'clamp(0.625rem, 2.5vw, 0.875rem)', fontSize: 'clamp(0.8125rem, 2.5vw, 0.875rem)' }}>
                        <span className={`badge ${
                          t.status === 'good' ? 'badge-success' : 
                          t.status === 'pending' ? 'badge-warning' : 
                          'badge-danger'
                        }`} style={{ fontSize: 'clamp(0.625rem, 1.75vw, 0.6875rem)' }}>
                          {t.status?.toUpperCase() || 'GOOD'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4" style={{ 
          padding: 'clamp(1rem, 3vw, 2rem)',
          zIndex: 1100
        }}>
          <div className="card w-full max-w-md animate-fadeIn" style={{ 
            borderRadius: 'clamp(0.75rem, 2vw, 1rem)',
            maxWidth: '100%',
            width: 'clamp(300px, 90vw, 480px)'
          }}>
            <div className="card-header" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 'clamp(0.75rem, 2.5vw, 1rem)'
            }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: 'clamp(1rem, 3vw, 1.125rem)' }}>Renew Subscription</h3>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setShowModal(false)}
                disabled={paying}
                style={{ 
                  padding: 'clamp(0.375rem, 1.5vw, 0.5rem)',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minWidth: '36px',
                  minHeight: '36px'
                }}
              >
                ✕
              </button>
            </div>
            <div className="card-body" style={{ padding: '0 clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 1.5rem)' }}>
              <p className="text-secondary mb-4" style={{ 
                fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)', 
                margin: '0 0 clamp(1rem, 3vw, 1.5rem) 0',
                lineHeight: 1.5
              }}>
                You are about to pay <strong className="text-primary" style={{ fontSize: 'inherit' }}>KSh {stats.subscription?.subscription_fee?.toLocaleString() || '0'}</strong> for your <strong style={{ fontSize: 'inherit' }}>{stats.subscription?.subscription_plan}</strong> plan.
              </p>
              
              <div className="form-group" style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <label className="form-label" style={{ 
                  fontSize: 'clamp(0.8125rem, 2.25vw, 0.875rem)',
                  marginBottom: '0.5rem',
                  display: 'block'
                }}>Select Payment Method</label>
                <select className="form-select" style={{ 
                  padding: 'clamp(0.75rem, 2.5vw, 0.875rem)',
                  fontSize: 'clamp(0.9375rem, 2.5vw, 1rem) !important',
                  minHeight: '48px'
                }}>
                  <option>M-Pesa STK Push</option>
                  <option>SasaPay</option>
                </select>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: 'clamp(0.75rem, 2.5vw, 1rem)', 
                marginTop: 'clamp(1.5rem, 4vw, 2rem)',
                flexDirection: 'column'
              }}>
                <button 
                  className="btn btn-primary flex-1" 
                  onClick={handleSubscriptionPayment}
                  disabled={paying}
                  style={{ 
                    padding: 'clamp(0.75rem, 2.5vw, 0.875rem)',
                    fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
                    minHeight: '48px'
                  }}
                >
                  {paying ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i> Processing...
                    </>
                  ) : 'Confirm & Pay'}
                </button>
                <button 
                  className="btn btn-secondary flex-1" 
                  onClick={() => setShowModal(false)}
                  disabled={paying}
                  style={{ 
                    padding: 'clamp(0.75rem, 2.5vw, 0.875rem)',
                    fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
                    minHeight: '48px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}