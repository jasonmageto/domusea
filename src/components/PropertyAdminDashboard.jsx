import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

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
      
      if (tenantList && tenantList.length > 0) {
        console.log('✅ Setting tenants:', tenantList);
        setTenants(tenantList);
      } else {
        console.log('⚠️ No tenants found');
        setTenants([]);
      }
      
      setAnnouncements(announcementsList);
    } catch (error) {
      console.error('❌ Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="card" style={{textAlign: 'center', padding: '40px'}}>Loading Dashboard...</div>;

  return (
    <div>
      <h2 style={{marginBottom: 24}}>Property Admin Dashboard</h2>

      {/* Subscription Info */}
      <div className="card" style={{marginBottom: 24, borderLeft: '4px solid var(--blue)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h3 style={{margin: '0 0 4px 0'}}>Subscription</h3>
            <p style={{margin: 0, color: 'var(--gray)'}}>
              {stats.subscription?.subscription_plan || 'N/A'} • {stats.subscription?.subscription_status || 'N/A'} • Due: {stats.subscription?.subscription_due || 'N/A'}
            </p>
          </div>
          <div style={{textAlign: 'right'}}>
            <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'var(--blue)'}}>
              {stats.subscription?.subscription_fee || 'KSh 0'}
            </p>
            <p style={{margin: 0, fontSize: '12px'}}>Monthly Fee</p>
          </div>
        </div>
      </div>

      {/* Revenue Grid */}
      <div className="grid" style={{marginBottom: 24}}>
        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: '14px'}}>Revenue (Confirmed)</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--green)'}}>
            KSh {stats.revenue.confirmed.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: '14px'}}>Pending</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--amber)'}}>
            KSh {stats.revenue.pending.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: '14px'}}>Occupancy</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0}}>
            {stats.occupancy.total} / {stats.occupancy.limit}
          </p>
          <p style={{fontSize: '12px', color: 'var(--gray)'}}>Units Occupied</p>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card" style={{marginBottom: 24}}>
          <h3 style={{margin: '0 0 12px 0'}}>📢 System Announcements</h3>
          {announcements.map(a => (
            <div key={a.id} style={{marginBottom: 8}}>
              <span style={{fontWeight: 'bold'}}>{a.subject}</span> <span className="badge">{a.priority}</span>
              <p style={{margin: '4px 0 0 0'}}>{a.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tenants List */}
      <div className="card">
        <h3 style={{margin: '0 0 16px 0'}}>Your Tenants</h3>
        {tenants.length === 0 ? (
          <p style={{color: 'var(--gray)'}}>No tenants added yet.</p>
        ) : (
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '8px 0'}}>Name</th>
                <th>House</th>
                <th>Rent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '12px 0'}}>{t.name}</td>
                  <td>{t.house}</td>
                  <td>KSh {t.rent}</td>
                  <td>
                    <span className={`badge ${t.status === 'good' ? 'status-green' : t.status === 'pending' ? 'status-amber' : 'status-red'}`}>
                      {t.status?.toUpperCase() || 'GOOD'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}