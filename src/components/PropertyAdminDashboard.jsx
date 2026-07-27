import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import {
  Wallet, Clock, PieChart, Megaphone, Users, CreditCard,
  X, Loader2
} from 'lucide-react';

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

      toast.success('STK Push sent! Check your phone to complete payment.');
      setShowModal(false);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
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
      <div className="pad-loading">
        <div className="pad-spinner"></div>
        <style>{padStyles}</style>
      </div>
    );
  }

  const occupancyPct = stats.occupancy.limit > 0
    ? Math.round((stats.occupancy.total / stats.occupancy.limit) * 100)
    : 0;

  return (
    <div className="pad-wrapper">
      <Toaster position="top-right" />

      <div className="pad-header">
        <div>
          <h1 className="pad-title">Property Admin Dashboard</h1>
          <p className="pad-subtitle">Manage your properties and tenants</p>
        </div>
      </div>

      {/* Subscription Info Card */}
      <div className="pad-card pad-sub-card">
        <div className="pad-sub-header">
          <h3>Subscription</h3>
          <button className="pad-pay-btn" onClick={() => setShowModal(true)}>
            <CreditCard size={15} />
            Pay
          </button>
        </div>
        <div className="pad-sub-grid">
          <div>
            <p className="pad-field-label">Plan</p>
            <p className="pad-field-value">{stats.subscription?.subscription_plan || 'N/A'}</p>
            <p className="pad-field-note">
              Status:{' '}
              <span className={`pad-badge ${stats.subscription?.subscription_status === 'Active' ? 'pad-badge-success' : 'pad-badge-warning'}`}>
                {stats.subscription?.subscription_status || 'N/A'}
              </span>
            </p>
          </div>

          <div>
            <p className="pad-field-label">Fee</p>
            <p className="pad-field-value pad-text-blue pad-field-value-lg">
              KSh {stats.subscription?.subscription_fee?.toLocaleString() || '0'}
            </p>
            <p className="pad-field-note">
              Due: {stats.subscription?.subscription_due ? new Date(stats.subscription.subscription_due).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div>
            <p className="pad-field-label">Tenants</p>
            <p className="pad-field-value">{stats.occupancy.total} / {stats.occupancy.limit}</p>
            <p className="pad-field-note">Units Occupied</p>
          </div>
        </div>
      </div>

      {/* Revenue Stats Grid */}
      <div className="pad-stats-grid">
        <div className="pad-stat-card pad-accent-green">
          <div className="pad-stat-top">
            <div>
              <div className="pad-stat-label">Revenue</div>
              <div className="pad-stat-value pad-text-green">KSh {stats.revenue.confirmed.toLocaleString()}</div>
            </div>
            <div className="pad-icon pad-icon-green"><Wallet size={20} /></div>
          </div>
          <div className="pad-stat-sub">Confirmed payments</div>
        </div>

        <div className="pad-stat-card pad-accent-amber">
          <div className="pad-stat-top">
            <div>
              <div className="pad-stat-label">Pending</div>
              <div className="pad-stat-value pad-text-amber">KSh {stats.revenue.pending.toLocaleString()}</div>
            </div>
            <div className="pad-icon pad-icon-amber"><Clock size={20} /></div>
          </div>
          <div className="pad-stat-sub">Awaiting confirmation</div>
        </div>

        <div className="pad-stat-card">
          <div className="pad-stat-top">
            <div>
              <div className="pad-stat-label">Occupancy</div>
              <div className="pad-stat-value">{occupancyPct}%</div>
            </div>
            <div className="pad-icon pad-icon-blue"><PieChart size={20} /></div>
          </div>
          <div className="pad-stat-sub">{stats.occupancy.total} of {stats.occupancy.limit} units</div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="pad-card">
          <div className="pad-card-header">
            <Megaphone size={17} />
            <h3>Announcements</h3>
          </div>
          <div className="pad-card-body">
            <div className="pad-announcement-list">
              {announcements.map(a => (
                <div key={a.id} className="pad-announcement-item">
                  <div className="pad-announcement-header">
                    <span className="pad-announcement-title">{a.subject}</span>
                    <span className={`pad-badge ${a.priority === 'High' ? 'pad-badge-danger' : a.priority === 'Medium' ? 'pad-badge-warning' : 'pad-badge-muted'}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="pad-announcement-text">{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="pad-card">
        <div className="pad-card-header pad-card-header-split">
          <div className="pad-card-header-inline">
            <Users size={17} />
            <h3>Your Tenants</h3>
          </div>
          <span className="pad-muted-count">{tenants.length} total</span>
        </div>
        <div className="pad-card-body pad-no-pad">
          {tenants.length === 0 ? (
            <div className="pad-empty">
              <Users size={32} />
              <p>No tenants added yet</p>
            </div>
          ) : (
            <div className="pad-table-container">
              <table className="pad-table">
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
                      <td className="pad-td-strong">{t.name}</td>
                      <td className="pad-td-muted">{t.house}</td>
                      <td className="pad-td-bold">KSh {t.rent?.toLocaleString()}</td>
                      <td>
                        <span className={`pad-badge ${
                          t.status === 'good' ? 'pad-badge-success' :
                          t.status === 'pending' ? 'pad-badge-warning' :
                          'pad-badge-danger'
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
        <div className="pad-modal-overlay" onClick={() => !paying && setShowModal(false)}>
          <div className="pad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pad-modal-header">
              <h3>Renew Subscription</h3>
              <button className="pad-modal-close" onClick={() => setShowModal(false)} disabled={paying}>
                <X size={18} />
              </button>
            </div>
            <div className="pad-modal-body">
              <p className="pad-modal-text">
                You are about to pay <strong className="pad-text-blue">KSh {stats.subscription?.subscription_fee?.toLocaleString() || '0'}</strong> for your <strong>{stats.subscription?.subscription_plan}</strong> plan.
              </p>

              <div className="pad-form-group">
                <label className="pad-form-label">Select Payment Method</label>
                <select className="pad-form-select">
                  <option>M-Pesa STK Push</option>
                  <option>SasaPay</option>
                </select>
              </div>

              <div className="pad-modal-actions">
                <button className="pad-btn-primary" onClick={handleSubscriptionPayment} disabled={paying}>
                  {paying ? (
                    <>
                      <Loader2 size={16} className="pad-spin" />
                      Processing...
                    </>
                  ) : 'Confirm & Pay'}
                </button>
                <button className="pad-btn-secondary" onClick={() => setShowModal(false)} disabled={paying}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{padStyles}</style>
    </div>
  );
}

const padStyles = `
.pad-wrapper {
  padding: clamp(1rem, 3vw, 2rem);
  max-width: 100%;
  overflow: hidden;
  animation: padFadeIn 0.4s ease;
  color: #1f2937;
}

@keyframes padFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.pad-spin { animation: padSpin 1s linear infinite; }
@keyframes padSpin { to { transform: rotate(360deg); } }

.pad-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
}

.pad-spinner {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  border-top-color: #1e3a5f;
  animation: padSpin 0.8s linear infinite;
}

.pad-header { margin-bottom: clamp(1rem, 3vw, 2rem); }

.pad-title {
  font-size: clamp(1.25rem, 4vw, 1.75rem);
  font-weight: 700;
  color: #1e3a5f;
  margin: 0;
  letter-spacing: -0.02em;
}

.pad-subtitle {
  font-size: clamp(0.875rem, 2.5vw, 0.9375rem);
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.pad-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #eef0f3;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  margin-bottom: clamp(1rem, 3vw, 1.5rem);
  overflow: hidden;
}

.pad-sub-card { padding: clamp(0.75rem, 2.5vw, 1.25rem); }

.pad-sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: clamp(0.75rem, 2.5vw, 1rem);
  margin-bottom: clamp(0.75rem, 2.5vw, 1rem);
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.pad-sub-header h3 {
  margin: 0;
  font-size: clamp(0.9375rem, 3vw, 1.125rem);
  font-weight: 600;
  color: #1f2937;
}

.pad-pay-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1e3a5f;
  color: #fff;
  border: none;
  padding: clamp(0.5rem, 2vw, 0.625rem) clamp(0.9rem, 2.5vw, 1.1rem);
  border-radius: 10px;
  font-weight: 600;
  font-size: clamp(0.75rem, 2.25vw, 0.875rem);
  cursor: pointer;
  transition: background 0.15s ease;
}
.pad-pay-btn:hover { background: #16304f; }

.pad-sub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: clamp(0.75rem, 2.5vw, 1rem);
}

.pad-field-label {
  font-size: clamp(0.6875rem, 2vw, 0.75rem);
  color: #6b7280;
  margin: 0 0 0.25rem 0;
}

.pad-field-value {
  font-size: clamp(0.9375rem, 2.5vw, 1rem);
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.pad-field-value-lg { font-size: clamp(1rem, 3vw, 1.125rem); font-weight: 700; }

.pad-field-note {
  font-size: clamp(0.6875rem, 2vw, 0.75rem);
  color: #9ca3af;
  margin: 0.25rem 0 0 0;
}

.pad-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(clamp(140px, 30vw, 240px), 1fr));
  gap: clamp(1rem, 3vw, 1.25rem);
  margin-bottom: clamp(1rem, 3vw, 2rem);
}

.pad-stat-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 18px 20px;
  border: 1px solid #eef0f3;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  border-top: 3px solid #1e3a5f;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.pad-stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(16, 24, 40, 0.08);
}
.pad-accent-green { border-top-color: #10b981; }
.pad-accent-amber { border-top-color: #f59e0b; }

.pad-stat-top { display: flex; justify-content: space-between; align-items: flex-start; }
.pad-stat-label { font-size: clamp(0.6875rem, 2vw, 0.75rem); color: #6b7280; font-weight: 500; margin-bottom: 4px; }
.pad-stat-value { font-size: clamp(1.25rem, 5vw, 1.75rem); font-weight: 700; color: #1f2937; line-height: 1.2; }
.pad-stat-sub { font-size: clamp(0.75rem, 2.25vw, 0.875rem); color: #9ca3af; margin-top: 10px; }

.pad-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pad-icon-blue { background: rgba(30, 58, 95, 0.1); color: #1e3a5f; }
.pad-icon-green { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.pad-icon-amber { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }

.pad-text-blue { color: #1e3a5f; }
.pad-text-green { color: #10b981; }
.pad-text-amber { color: #f59e0b; }

.pad-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  color: #1e3a5f;
}
.pad-card-header h3 { font-size: clamp(0.9375rem, 3vw, 1.125rem); font-weight: 600; margin: 0; color: #1f2937; }
.pad-card-header-split { justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
.pad-card-header-inline { display: flex; align-items: center; gap: 8px; }

.pad-muted-count { color: #9ca3af; font-size: clamp(0.75rem, 2vw, 0.8125rem); }

.pad-card-body { padding: 16px 20px 20px; }
.pad-no-pad { padding: 0; }

.pad-announcement-list { display: flex; flex-direction: column; gap: clamp(0.75rem, 2.5vw, 1rem); }

.pad-announcement-item {
  padding: clamp(0.75rem, 2.5vw, 1rem);
  background: #f9fafb;
  border-radius: 10px;
  border-left: 4px solid #1e3a5f;
}

.pad-announcement-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.pad-announcement-title {
  font-weight: 600;
  color: #1f2937;
  font-size: clamp(0.875rem, 2.5vw, 0.9375rem);
}

.pad-announcement-text {
  font-size: clamp(0.8125rem, 2.25vw, 0.875rem);
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
}

.pad-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: clamp(0.625rem, 1.75vw, 0.6875rem);
  font-weight: 600;
}
.pad-badge-success { background: rgba(16, 185, 129, 0.12); color: #059669; }
.pad-badge-warning { background: rgba(245, 158, 11, 0.12); color: #b45309; }
.pad-badge-danger { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
.pad-badge-muted { background: #f1f5f9; color: #64748b; }

.pad-empty {
  text-align: center;
  padding: clamp(2rem, 5vw, 3rem);
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.pad-empty p { font-size: clamp(0.875rem, 2.5vw, 0.9375rem); margin: 0; }

.pad-table-container { overflow-x: auto; border-radius: 12px; }

.pad-table {
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(0.8125rem, 2.5vw, 0.875rem);
  min-width: 600px;
}

.pad-table thead tr { border-bottom: 2px solid #eef0f3; }

.pad-table th {
  padding: clamp(0.625rem, 2.5vw, 0.875rem);
  text-align: left;
  font-weight: 600;
  color: #6b7280;
  font-size: clamp(0.6875rem, 2vw, 0.75rem);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pad-table tbody tr { border-bottom: 1px solid #f3f4f6; transition: background 0.15s ease; }
.pad-table tbody tr:hover { background: #f9fafb; }
.pad-table tbody tr:last-child { border-bottom: none; }

.pad-table td { padding: clamp(0.625rem, 2.5vw, 0.875rem); font-size: clamp(0.8125rem, 2.5vw, 0.875rem); }
.pad-td-strong { font-weight: 600; color: #1f2937; }
.pad-td-muted { color: #6b7280; }
.pad-td-bold { font-weight: 700; color: #1f2937; }

.pad-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: clamp(1rem, 3vw, 2rem);
}

.pad-modal {
  background: #ffffff;
  border-radius: clamp(0.75rem, 2vw, 1rem);
  width: clamp(300px, 90vw, 480px);
  max-width: 100%;
  animation: padFadeIn 0.25s ease;
}

.pad-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(0.75rem, 2.5vw, 1rem) clamp(1rem, 3vw, 1.5rem);
  border-bottom: 1px solid #f3f4f6;
}
.pad-modal-header h3 { margin: 0; font-size: clamp(1rem, 3vw, 1.125rem); color: #1f2937; }

.pad-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  padding: 6px;
  border-radius: 8px;
}
.pad-modal-close:hover { background: #f1f5f9; }
.pad-modal-close:disabled { opacity: 0.5; cursor: not-allowed; }

.pad-modal-body { padding: clamp(1rem, 3vw, 1.5rem); }

.pad-modal-text {
  font-size: clamp(0.875rem, 2.5vw, 0.9375rem);
  margin: 0 0 clamp(1rem, 3vw, 1.5rem) 0;
  line-height: 1.5;
  color: #374151;
}

.pad-form-group { margin-bottom: clamp(1rem, 3vw, 1.5rem); }

.pad-form-label {
  font-size: clamp(0.8125rem, 2.25vw, 0.875rem);
  margin-bottom: 0.5rem;
  display: block;
  font-weight: 500;
  color: #374151;
}

.pad-form-select {
  width: 100%;
  padding: clamp(0.75rem, 2.5vw, 0.875rem);
  font-size: clamp(0.9375rem, 2.5vw, 1rem);
  min-height: 48px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #1f2937;
}
.pad-form-select:focus { outline: none; border-color: #1e3a5f; }

.pad-modal-actions {
  display: flex;
  gap: clamp(0.75rem, 2.5vw, 1rem);
  margin-top: clamp(1.5rem, 4vw, 2rem);
  flex-direction: column;
}

.pad-btn-primary, .pad-btn-secondary {
  padding: clamp(0.75rem, 2.5vw, 0.875rem);
  font-size: clamp(0.875rem, 2.5vw, 0.9375rem);
  min-height: 48px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  transition: opacity 0.15s ease;
}

.pad-btn-primary { background: #1e3a5f; color: #fff; }
.pad-btn-primary:hover:not(:disabled) { background: #16304f; }
.pad-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.pad-btn-secondary { background: #f1f5f9; color: #374151; }
.pad-btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
.pad-btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
`;
