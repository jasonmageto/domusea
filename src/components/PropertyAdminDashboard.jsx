import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';  // ✅ Fixed: Changed from './AuthContext' to '../AuthContext'
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

      console.log('Subscription result:', subResult);
      const subData = subResult.data;

      // 2. Fetch Tenant Count
      const countResult = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', adminId);

      console.log('Count result:', countResult);
      const count = countResult.count;

      // 3. Fetch Tenant List
      const tenantResult = await supabase
        .from('tenants')
        .select('*')
        .eq('admin_id', adminId)
        .order('house');

      console.log('Tenant result:', tenantResult);
      const tenantList = tenantResult.data;
      console.log('📊 Actual tenants fetched:', tenantList);

      // 4. Fetch Payments
      const paymentsResult = await supabase
        .from('payments')
        .select('amount, status')
        .eq('admin_id', adminId);

      const payments = paymentsResult.data || [];
      const confirmed = payments.filter(p => p.status === 'Confirmed').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
      const pending = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

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

  const downloadTenantPDF = () => {
    try {
      if (tenants.length === 0) {
        alert('No tenants to export');
        return;
      }
      
      const headers = ['Name', 'House/Unit', 'Rent Amount', 'Payment Status'];
      const data = tenants.map(t => [
        t.name || 'N/A',
        t.house || 'N/A',
        `KSh ${parseFloat(t.rent || 0).toLocaleString()}`,
        t.status?.toUpperCase() || 'GOOD'
      ]);
      
      const success = exportToPDF({
        title: 'Property Tenant Records',
        filename: 'My_Tenants_List',
        headers,
        data,
        subtitle: `Property Manager: ${userProfile?.name} | Total Tenants: ${tenants.length}`
      });
      
      if (success) {
        console.log('PDF generated successfully');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center" style={{ minHeight: '200px' }}>
        <div className="animate-pulse text-muted font-medium">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Property Admin Dashboard</h1>
        {tenants.length > 0 && (
          <button onClick={downloadTenantPDF} className="btn btn-danger">
            <i className="fas fa-file-pdf"></i>
            Download Tenant PDF
          </button>
        )}
      </div>

      {/* Subscription Card */}
      <div className="card mb-6" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-base mb-1 m-0">Subscription</h3>
            <p className="text-muted text-sm m-0">
              {stats.subscription?.subscription_plan || 'N/A'} •{' '}
              <span className={`badge ${
                stats.subscription?.subscription_status === 'Active' ? 'badge-success' : 'badge-warning'
              }`}>
                {stats.subscription?.subscription_status || 'N/A'}
              </span>{' '}
              • Due: {stats.subscription?.subscription_due || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary m-0">
              KSh {(stats.subscription?.subscription_fee || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted m-0">Monthly Fee</p>
          </div>
        </div>
      </div>

      {/* Revenue & Occupancy Grid */}
      <div className="stats-grid mb-6">
        {/* Confirmed Revenue */}
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
          <div className="stat-subtitle">Total collected this month</div>
        </div>

        {/* Pending Revenue */}
        <div className="stat-card warning">
          <div className="stat-header">
            <div>
              <div className="stat-label">Pending</div>
              <div className="stat-value text-warning">
                KSh {stats.revenue.pending.toLocaleString()}
              </div>
            </div>
            <div className="stat-icon orange">
              <i className="fas fa-clock"></i>
            </div>
          </div>
          <div className="stat-subtitle">Awaiting payment</div>
        </div>

        {/* Occupancy */}
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Occupancy</div>
              <div className="stat-value">
                {stats.occupancy.total} / {stats.occupancy.limit}
              </div>
            </div>
            <div className="stat-icon purple">
              <i className="fas fa-home"></i>
            </div>
          </div>
          <div className="stat-subtitle">
            Units Occupied ({stats.occupancy.limit > 0 
              ? Math.round((stats.occupancy.total / stats.occupancy.limit) * 100) 
              : 0}%)
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <i className="fas fa-bullhorn text-primary"></i>
            <h2 className="card-title">System Announcements</h2>
          </div>
          <div className="announcement-list">
            {announcements.map(a => (
              <div 
                key={a.id} 
                className={`announcement-item ${a.priority === 'High' ? 'important' : ''}`}
              >
                <div className="announcement-header">
                  <span className="announcement-title">{a.subject}</span>
                  {a.priority && (
                    <span className={`badge ${
                      a.priority === 'High' ? 'badge-danger' : 
                      a.priority === 'Medium' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {a.priority}
                    </span>
                  )}
                </div>
                <p className="announcement-text">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="card">
        <div className="card-header">
          <i className="fas fa-users text-primary"></i>
          <h2 className="card-title">Your Tenants</h2>
        </div>
        
        {tenants.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-user-slash text-muted" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
            <p className="text-muted">No tenants added yet.</p>
            <a href="#add-property" className="btn btn-primary btn-sm mt-4">
              <i className="fas fa-plus"></i> Add Your First Tenant
            </a>
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
                  <tr key={t.id} className="transition">
                    <td className="font-semibold">{t.name}</td>
                    <td>
                      <span className="badge badge-info">{t.house || 'N/A'}</span>
                    </td>
                    <td className="text-success font-bold">
                      KSh {parseFloat(t.rent || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${
                        t.status === 'good' || !t.status 
                          ? 'badge-success' 
                          : t.status === 'pending' 
                            ? 'badge-warning' 
                            : 'badge-danger'
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
  );
}