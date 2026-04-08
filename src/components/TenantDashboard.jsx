import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function TenantDashboard() {
  const { userProfile } = useAuth();
  const [tenantData, setTenantData] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (userProfile && userProfile.email) {
      console.log('📊 Dashboard: Loading for email:', userProfile.email);
      fetchDashboardData();
    }
  }, [userProfile]);

  async function fetchDashboardData() {
    try {
      console.log('🔍 Searching for tenant with email:', userProfile.email);
      
      // 1. Get full tenant details
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('email', userProfile.email)
        .single();

      if (tenantError) {
        console.error('❌ Tenant fetch error:', tenantError);
      }

      console.log('✅ Tenant data:', tenant);

      if (!tenant) {
        setLoading(false);
        return;
      }

      setTenantData(tenant);

      // 2. Get recent payments (last 3)
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('date', { ascending: false })
        .limit(3);

      setRecentPayments(payments || []);

      // 3. Get open/pending requests
      const { data: requests } = await supabase
        .from('complaints')
        .select('*')
        .eq('tenant_id', tenant.id)
        .in('status', ['Open', 'In Progress'])
        .order('created_at', { ascending: false });

      setOpenRequests(requests || []);

      // 4. Get announcements (if any)
      const { data: announcementsList } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      setAnnouncements(announcementsList || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="card" style={{textAlign: 'center', padding: '40px'}}>Loading dashboard...</div>;
  }

  if (!tenantData) {
    return (
      <div className="card">
        <h2>⚠️ Tenant Profile Not Found</h2>
        <p><strong>Email:</strong> {userProfile?.email}</p>
        <p>Please contact your property admin to ensure your account is set up correctly.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          🔄 Refresh Page
        </button>
      </div>
    );
  }

  const daysUntilDue = Math.ceil((new Date(tenantData.due_date) - new Date()) / 86400000);
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 3 && daysUntilDue >= 0;

  const getStatusColor = (status) => {
    if (status === 'Confirmed') return 'var(--green)';
    if (status === 'Pending') return 'var(--amber)';
    return 'var(--red)';
  };

  return (
    <div>
      <h2 style={{marginBottom: 24}}>Welcome, {tenantData.name}!</h2>

      {/* Account Overview Cards */}
      <div className="grid" style={{marginBottom: 24}}>
        <div className="card" style={{borderLeft: '4px solid var(--blue)'}}>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: 'var(--gray)'}}>Current Unit</h3>
          <p style={{fontSize: '28px', fontWeight: '700', margin: 0}}>{tenantData.house}</p>
          <p style={{margin: '4px 0 0 0', color: 'var(--gray)', fontSize: '13px'}}>
            Monthly Rent: KSh {tenantData.rent}
          </p>
        </div>

        <div className="card" style={{borderLeft: `4px solid ${isOverdue ? 'var(--red)' : isUrgent ? 'var(--amber)' : 'var(--green)'}`}}>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: 'var(--gray)'}}>Rent Status</h3>
          <p style={{fontSize: '28px', fontWeight: '700', margin: 0, color: isOverdue ? 'var(--red)' : isUrgent ? 'var(--amber)' : 'var(--green)'}}>
            {isOverdue ? 'Overdue' : isUrgent ? 'Due Soon' : 'On Track'}
          </p>
          <p style={{margin: '4px 0 0 0', color: 'var(--gray)', fontSize: '13px'}}>
            {isOverdue 
              ? `${Math.abs(daysUntilDue)} days overdue` 
              : isUrgent 
                ? `${daysUntilDue} days remaining` 
                : `${daysUntilDue} days until due`}
          </p>
        </div>

        <div className="card" style={{borderLeft: '4px solid var(--purple)'}}>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: 'var(--gray)'}}>Account Status</h3>
          <p style={{fontSize: '28px', fontWeight: '700', margin: 0}}>
            {tenantData.status === 'good' ? 'Good' : tenantData.status === 'pending' ? 'Pending' : 'Overdue'}
          </p>
          <p style={{margin: '4px 0 0 0', color: 'var(--gray)', fontSize: '13px'}}>
            {tenantData.status === 'good' ? 'All payments up to date' : 'Action may be required'}
          </p>
        </div>
      </div>

      {/* Urgent Alert */}
      {(isOverdue || isUrgent) && (
        <div className="card" style={{
          marginBottom: 24, 
          background: isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          borderLeft: `4px solid ${isOverdue ? 'var(--red)' : 'var(--amber)'}`
        }}>
          <p style={{margin: 0, fontWeight: 600, color: isOverdue ? 'var(--red)' : 'var(--amber)'}}>
            {isOverdue 
              ? `⚠️ Your rent is OVERDUE by ${Math.abs(daysUntilDue)} days! Please make payment immediately.` 
              : `⏰ Rent is due in ${daysUntilDue} days. Don't forget to pay!`}
          </p>
        </div>
      )}

      {/* Recent Payments */}
      <div className="card" style={{marginBottom: 24}}>
        <h3 style={{marginTop: 0}}>Recent Payments</h3>
        {recentPayments.length === 0 ? (
          <p style={{color: 'var(--gray)', fontSize: '13px'}}>No payments recorded yet.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {recentPayments.map(payment => (
              <div key={payment.id} style={{
                padding: 12,
                background: 'var(--bg)',
                borderRadius: 6,
                borderLeft: `3px solid ${getStatusColor(payment.status)}`
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <strong>KSh {payment.amount}</strong>
                  <span className="badge" style={{
                    background: getStatusColor(payment.status),
                    color: 'white',
                    fontSize: '11px'
                  }}>
                    {payment.status}
                  </span>
                </div>
                <div style={{fontSize: '12px', color: 'var(--gray)', marginTop: 4}}>
                  {new Date(payment.date).toLocaleDateString()} • {payment.method}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Requests */}
      <div className="card" style={{marginBottom: 24}}>
        <h3 style={{marginTop: 0}}>Active Requests</h3>
        {openRequests.length === 0 ? (
          <p style={{color: 'var(--gray)', fontSize: '13px'}}>No open requests.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {openRequests.map(request => (
              <div key={request.id} style={{
                padding: 12,
                background: 'var(--bg)',
                borderRadius: 6
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <strong>{request.subject}</strong>
                  <span className="badge" style={{
                    background: request.status === 'Open' ? 'var(--red)' : 'var(--amber)',
                    color: 'white',
                    fontSize: '11px'
                  }}>
                    {request.status}
                  </span>
                </div>
                <div style={{fontSize: '12px', color: 'var(--gray)', marginTop: 4}}>
                  {request.message.substring(0, 50)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}