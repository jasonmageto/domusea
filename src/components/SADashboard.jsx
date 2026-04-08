import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function SADashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalTenants: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    activeSubscriptions: 0,
    overdueSubscriptions: 0
  });
  const [admins, setAdmins] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch total admins
      const { count: adminCount } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true });

      // Fetch total tenants
      const { count: tenantCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

      // Fetch admin-to-SA payments (confirmed)
      const {  payments } = await supabase
        .from('admin_to_sa_payments')
        .select('amount, status')
        .eq('status', 'Confirmed');

      // Fetch all admins with subscription info
      const {  adminsData } = await supabase
        .from('admins')
        .select('subscription_status, subscription_due, subscription_fee, name, email, tenant_limit, frozen');

      // Fetch recent activity log
      const {  activityData } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate stats
      const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const pendingPayments = payments?.filter(p => p.status === 'Pending').length || 0;
      const activeSubscriptions = adminsData?.filter(a => a.subscription_status === 'Active').length || 0;
      const overdueSubscriptions = adminsData?.filter(a => {
        const dueDate = new Date(a.subscription_due);
        return a.subscription_status !== 'Active' || dueDate < new Date();
      }).length || 0;

      setStats({
        totalAdmins: adminCount || 0,
        totalTenants: tenantCount || 0,
        totalRevenue,
        pendingPayments,
        activeSubscriptions,
        overdueSubscriptions
      });

      setAdmins(adminsData || []);
      setRecentActivity(activityData || []);
    } catch (error) {
      console.error('Error fetching dashboard ', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount).toLocaleString()}`;
  };

  if (loading) {
    return <div className="card" style={{textAlign: 'center', padding: '40px'}}>Loading dashboard...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: '24px'}}>
        <h2 style={{margin: 0}}>Supreme Admin Dashboard</h2>
        <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>Welcome back, {userProfile?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid" style={{marginBottom: '24px'}}>
        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: '14px'}}>Total Admins</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0}}>{stats.totalAdmins}</p>
          <p style={{fontSize: '12px', color: 'var(--gray)', margin: '4px 0 0 0'}}>Property managers</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: '14px'}}>Total Tenants</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0}}>{stats.totalTenants}</p>
          <p style={{fontSize: '12px', color: 'var(--gray)', margin: '4px 0 0 0'}}>System-wide</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: '14px'}}>Total Revenue</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--green)'}}>
            {formatCurrency(stats.totalRevenue)}
          </p>
          <p style={{fontSize: '12px', color: 'var(--gray)', margin: '4px 0 0 0'}}>From admin subscriptions</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: '14px'}}>Subscriptions</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0}}>
            <span style={{color: 'var(--green)'}}>{stats.activeSubscriptions}</span>
            <span style={{fontSize: '16px', color: 'var(--gray)', margin: '0 8px'}}>/</span>
            <span style={{color: 'var(--red)'}}>{stats.overdueSubscriptions}</span>
          </p>
          <p style={{fontSize: '12px', color: 'var(--gray)', margin: '4px 0 0 0'}}>Active / Overdue</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{margin: '0 0 16px 0'}}>Quick Actions</h3>
        <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
          <button className="btn btn-primary" onClick={() => setActiveTab('admins')}>
            ➕ Create Admin
          </button>
          <button className="btn" style={{background: 'var(--blue)', color: 'white'}} onClick={() => setActiveTab('announcements')}>
            📢 New Announcement
          </button>
          <button className="btn" style={{background: 'var(--amber)', color: 'white'}} onClick={() => setActiveTab('payments')}>
            💰 View Payments
          </button>
          <button className="btn" onClick={() => setActiveTab('activity')}>
            📋 Activity Log
          </button>
        </div>
      </div>

      {/* Recent Admins */}
      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{margin: '0 0 16px 0'}}>Recent Admins</h3>
        {admins.length === 0 ? (
          <p style={{color: 'var(--gray)'}}>No admins yet. Click "Create Admin" to add one.</p>
        ) : (
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '8px 0'}}>Name</th>
                <th>Email</th>
                <th>Tenants</th>
                <th>Subscription</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {admins.slice(0, 5).map((admin) => (
                <tr key={admin.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '12px 0'}}>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.tenant_limit || 50}</td>
                  <td>
                    <span className={`badge ${admin.subscription_status === 'Active' ? 'status-green' : 'status-red'}`}>
                      {admin.subscription_status}
                    </span>
                  </td>
                  <td>
                    {admin.frozen ? (
                      <span className="badge status-red">Frozen ❄️</span>
                    ) : (
                      <span className="badge status-green">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 style={{margin: '0 0 16px 0'}}>Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p style={{color: 'var(--gray)'}}>No recent activity</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {recentActivity.map((log) => (
              <div key={log.id} style={{padding: '12px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)'}}>
                <p style={{margin: 0, fontWeight: '500'}}>{log.message}</p>
                <p style={{margin: '4px 0 0 0', fontSize: '12px', color: 'var(--gray)'}}>
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}