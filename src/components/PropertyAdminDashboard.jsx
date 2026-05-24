import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { exportToPDF } from '../utils/pdfExport';

export default function PropertyAdminDashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    subscription: null,
    revenue: { confirmed: 0, pending: 0 },
    occupancy: { total: 0, limit: 50 }
  });
  const [tenants, setTenants] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const fetchDashboardData = useCallback(async (adminId) => {
    try {
      const subResult = await supabase
        .from('admins')
        .select('subscription_plan, subscription_fee, subscription_due, subscription_status, tenant_limit')
        .eq('id', adminId)
        .single();

      const subData = subResult.data;

      const countResult = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId);

      const count = countResult.count;

      const tenantResult = await supabase
        .from('tenants')
        .select('*')
        .eq('admin_id', adminId)
        .order('house');

      const tenantList = tenantResult.data;

      const paymentsResult = await supabase
        .from('payments')
        .select('amount, status')
        .eq('admin_id', adminId);

      const payments = paymentsResult.data || [];
      const confirmed = payments.filter(p => p.status === 'Confirmed').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const pending = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

      const announcementsResult = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      const announcementsList = announcementsResult.data || [];

      setStats({
        subscription: subData,
        revenue: { confirmed, pending },
        occupancy: { total: count || 0, limit: subData?.tenant_limit || 50 }
      });
      
      setTenants(tenantList || []);
      setAnnouncements(announcementsList);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userProfile?.id) {
      fetchDashboardData(userProfile.id);
    }
  }, [userProfile?.id, fetchDashboardData]);

  const downloadTenantPDF = () => {
    const headers = ['Name', 'House/Unit', 'Rent Amount', 'Payment Status'];
    const data = tenants.map(t => [
      t.name,
      t.house || 'N/A',
      `KSh ${parseFloat(t.rent).toLocaleString()}`,
      t.status?.toUpperCase() || 'GOOD'
    ]);
    exportToPDF({
      title: 'Property Tenant Records',
      filename: 'My_Tenants_List',
      headers,
      data,
      subtitle: `Property Manager: ${userProfile?.name} | Total Tenants: ${tenants.length}`
    });
  };

  if (loading) return <div className="mockup-card" style={{textAlign: 'center', padding: '40px'}}>Loading Dashboard...</div>;

  return (
    <div className="mockup-container">
      <div className="mockup-page-header">
        <h1 className="mockup-page-title">Property Admin Dashboard</h1>
        <button onClick={downloadTenantPDF} className="mockup-btn mockup-btn-primary">
          <i className="fas fa-file-pdf"></i>
          Download Tenant PDF
        </button>
      </div>

      {/* Stats Grid */}
      <div className="mockup-stats-grid">
        <div className="mockup-stat-card">
          <div className="mockup-stat-header">
            <div>
              <div className="mockup-stat-label">Subscription</div>
              <div className="mockup-stat-value">KSh {stats.subscription?.subscription_fee?.toLocaleString() || '0'}</div>
              <div className="mockup-subscription-badge">
                <i className="fas fa-check-circle"></i>
                {stats.subscription?.subscription_status || 'Active'} • Due: {stats.subscription?.subscription_due || 'N/A'}
              </div>
            </div>
            <div className="mockup-stat-icon blue">
              <i className="fas fa-crown"></i>
            </div>
          </div>
          <div className="mockup-stat-subtitle">Monthly Fee</div>
        </div>

        <div className="mockup-stat-card">
          <div className="mockup-stat-header">
            <div>
              <div className="mockup-stat-label">Revenue (Confirmed)</div>
              <div className="mockup-stat-value" style={{color: '#10b981'}}>KSh {stats.revenue.confirmed.toLocaleString()}</div>
            </div>
            <div className="mockup-stat-icon green">
              <i className="fas fa-wallet"></i>
            </div>
          </div>
          <div className="mockup-stat-subtitle">Total collected this month</div>
        </div>

        <div className="mockup-stat-card">
          <div className="mockup-stat-header">
            <div>
              <div className="mockup-stat-label">Pending</div>
              <div className="mockup-stat-value" style={{color: '#f59e0b'}}>KSh {stats.revenue.pending.toLocaleString()}</div>
            </div>
            <div className="mockup-stat-icon orange">
              <i className="fas fa-clock"></i>
            </div>
          </div>
          <div className="mockup-stat-subtitle">Awaiting payment</div>
        </div>

        <div className="mockup-stat-card">
          <div className="mockup-stat-header">
            <div>
              <div className="mockup-stat-label">Occupancy</div>
              <div className="mockup-stat-value">{stats.occupancy.total} / {stats.occupancy.limit}</div>
            </div>
            <div className="mockup-stat-icon purple">
              <i className="fas fa-home"></i>
            </div>
          </div>
          <div className="mockup-stat-subtitle">Units Occupied ({Math.round((stats.occupancy.total / stats.occupancy.limit) * 100)}%)</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="mockup-content-grid">
        {/* Announcements */}
        <div className="mockup-card">
          <div className="mockup-card-header">
            <i className="fas fa-bullhorn" style={{color: '#4f46e5', fontSize: '1.25rem'}}></i>
            <h2 className="mockup-card-title">System Announcements</h2>
          </div>
          
          {announcements.length > 0 ? announcements.map(a => (
            <div key={a.id} className="mockup-announcement-item">
              <div className="mockup-announcement-header">
                <span className="mockup-announcement-title">{a.subject}</span>
                {a.priority === 'High' && <span className="mockup-badge-important">IMPORTANT</span>}
              </div>
              <p className="mockup-announcement-text">{a.message}</p>
            </div>
          )) : (
            <p className="mockup-announcement-text">No announcements at this time.</p>
          )}
        </div>

        {/* Tenants Table */}
        <div className="mockup-card">
          <div className="mockup-card-header">
            <i className="fas fa-users" style={{color: '#4f46e5', fontSize: '1.25rem'}}></i>
            <h2 className="mockup-card-title">Your Tenants</h2>
          </div>
          
          <div className="mockup-table-container">
            <table className="mockup-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>House</th>
                  <th>Rent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length > 0 ? tenants.map(t => (
                  <tr key={t.id}>
                    <td className="mockup-tenant-name">{t.name}</td>
                    <td><span className="mockup-house-code">{t.house}</span></td>
                    <td className="mockup-rent-amount">KSh {parseFloat(t.rent).toLocaleString()}</td>
                    <td><span className={`mockup-status-badge ${t.status === 'good' ? 'mockup-status-active' : ''}`}>{t.status?.toUpperCase() || 'GOOD'}</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{textAlign: 'center', padding: '2rem', color: '#64748b'}}>No tenants found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
