import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

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
      // This would call your M-Pesa/SasaPay integration
      console.log("Initiating payment for admin:", userProfile.id);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert("STK Push sent! Please check your phone to complete the payment.");
      setShowModal(false);
    } catch (error) {
      alert("Payment failed. Please try again.");
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
    <div className="dashboard-wrapper animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Property Admin Dashboard</h1>
          <p className="page-subtitle">Manage your properties and tenants</p>
        </div>
      </div>

      {/* Subscription Info Card */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">Subscription Details</h3>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowModal(true)}
          >
            Pay Subscription
          </button>
        </div>
        <div className="card-body">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted mb-1">Current Plan</p>
              <p className="font-semibold text-lg">
                {stats.subscription?.subscription_plan || 'N/A'}
              </p>
              <p className="text-sm text-muted mt-1">
                Status: <span className={`badge ${stats.subscription?.subscription_status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                  {stats.subscription?.subscription_status || 'N/A'}
                </span>
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-muted mb-1">Monthly Fee</p>
              <p className="text-2xl font-bold text-primary">
                KSh {stats.subscription?.subscription_fee?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-muted mt-1">
                Due: {stats.subscription?.subscription_due || 'N/A'}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-muted mb-1">Tenant Limit</p>
              <p className="text-xl font-semibold">
                {stats.occupancy.total} / {stats.occupancy.limit}
              </p>
              <p className="text-xs text-muted mt-1">Units Occupied</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-header">
            <div>
              <div className="stat-label">Revenue (Confirmed)</div>
              <div className="stat-value text-success">
                KSh {stats.revenue.confirmed.toLocaleString()}
              </div>
            </div>
            <div className="stat-icon green">
              <i className="fas fa-wallet"></i>
            </div>
          </div>
          <div className="stat-subtitle">From tenant rent payments</div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-header">
            <div>
              <div className="stat-label">Pending Payments</div>
              <div className="stat-value text-warning">
                KSh {stats.revenue.pending.toLocaleString()}
              </div>
            </div>
            <div className="stat-icon orange">
              <i className="fas fa-clock"></i>
            </div>
          </div>
          <div className="stat-subtitle">Awaiting confirmation</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Occupancy Rate</div>
              <div className="stat-value">
                {stats.occupancy.limit > 0 
                  ? Math.round((stats.occupancy.total / stats.occupancy.limit) * 100) 
                  : 0}%
              </div>
            </div>
            <div className="stat-icon blue">
              <i className="fas fa-chart-pie"></i>
            </div>
          </div>
          <div className="stat-subtitle">{stats.occupancy.total} of {stats.occupancy.limit} units</div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">📢 System Announcements</h3>
          </div>
          <div className="card-body">
            <div className="announcement-list">
              {announcements.map(a => (
                <div key={a.id} className="announcement-item">
                  <div className="announcement-header">
                    <span className="announcement-title">{a.subject}</span>
                    <span className={`badge ${a.priority === 'High' ? 'badge-danger' : a.priority === 'Medium' ? 'badge-warning' : 'badge-muted'}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="announcement-text">{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Your Tenants</h3>
          <span className="text-muted text-sm">{tenants.length} total</span>
        </div>
        <div className="card-body">
          {tenants.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block', opacity: 0.5 }}></i>
              No tenants added yet
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>House</th>
                    <th>Rent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id}>
                      <td className="font-semibold">{t.name}</td>
                      <td className="text-muted">{t.house}</td>
                      <td className="font-bold">KSh {t.rent?.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          t.status === 'good' ? 'badge-success' : 
                          t.status === 'pending' ? 'badge-warning' : 
                          'badge-danger'
                        }`}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4">
          <div className="card w-full max-w-md animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Renew Subscription</h3>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setShowModal(false)}
                disabled={paying}
              >
                ✕
              </button>
            </div>
            <div className="card-body">
              <p className="text-secondary mb-4">
                You are about to pay <strong className="text-primary">KSh {stats.subscription?.subscription_fee?.toLocaleString() || '0'}</strong> for your <strong>{stats.subscription?.subscription_plan}</strong> plan.
              </p>
              
              <div className="form-group">
                <label className="form-label">Select Payment Method</label>
                <select className="form-select">
                  <option>M-Pesa STK Push</option>
                  <option>SasaPay</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  className="btn btn-primary flex-1" 
                  onClick={handleSubscriptionPayment}
                  disabled={paying}
                >
                  {paying ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Processing...
                    </>
                  ) : 'Confirm & Pay'}
                </button>
                <button 
                  className="btn btn-secondary flex-1" 
                  onClick={() => setShowModal(false)}
                  disabled={paying}
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