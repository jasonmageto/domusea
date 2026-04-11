import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    activeAdmins: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    totalReceived: 0
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [activeAdminsList, setActiveAdminsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // Fetch admins
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('*');

      if (adminsError) {
        console.error('Error fetching admins:', adminsError);
        return;
      }

      const totalAdmins = adminsData?.length || 0;
      const activeAdminsCount = adminsData?.filter(a => a.subscription_status === 'Active')?.length || 0;

      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*');

      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        return;
      }

      const totalTenants = tenantsData?.length || 0;

      // Fetch payments with admin details
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('admin_to_sa_payments')
        .select(`
          *,
          admins:admin_id (
            name,
            email
          )
        `)
        .order('date', { ascending: false })
        .limit(10);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        return;
      }

      console.log('Dashboard payments data:', paymentsData);

      // Calculate stats
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const confirmedPayments = paymentsData?.filter(p => p.status === 'Confirmed') || [];
      
      const monthlyRevenue = confirmedPayments
        .filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate.getMonth() === currentMonth && 
                 paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const totalReceived = confirmedPayments
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const pendingPaymentsCount = paymentsData?.filter(p => p.status === 'Pending')?.length || 0;

      const activeAdmins = adminsData?.filter(a => a.subscription_status === 'Active') || [];

      setStats({
        totalAdmins,
        activeAdmins: activeAdminsCount,
        totalTenants,
        monthlyRevenue,
        pendingPayments: pendingPaymentsCount,
        totalReceived
      });

      setRecentPayments(paymentsData || []);
      setActiveAdminsList(activeAdmins.slice(0, 5));

      console.log('Dashboard stats:', {
        totalAdmins,
        activeAdmins: activeAdminsCount,
        totalTenants,
        monthlyRevenue,
        pendingPayments: pendingPaymentsCount,
        totalReceived
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `KSh ${num.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: 40}}>
        <div style={{fontSize: 24, marginBottom: 16}}>⏳</div>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{marginBottom: 32}}>
        <h1 style={{margin: 0, fontSize: 28}}>Dashboard</h1>
        <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>Welcome back, Supreme Admin</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        <div className="card" style={{borderLeft: '4px solid #10b981', padding: 20}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>MONTHLY REVENUE</div>
          <div style={{fontSize: 36, fontWeight: 700, color: '#10b981'}}>{formatCurrency(stats.monthlyRevenue)}</div>
          <div style={{fontSize: 12, color: '#059669'}}>↑ 0.0% vs last month</div>
        </div>
        
        <div className="card" style={{borderLeft: '4px solid #f59e0b', padding: 20}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>PENDING PAYMENTS</div>
          <div style={{fontSize: 36, fontWeight: 700, color: '#f59e0b'}}>{stats.pendingPayments}</div>
          <div style={{fontSize: 12, color: '#d97706'}}>Awaiting confirmation</div>
        </div>
        
        <div className="card" style={{borderLeft: '4px solid #3b82f6', padding: 20}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>ACTIVE ADMINS</div>
          <div style={{fontSize: 36, fontWeight: 700, color: '#3b82f6'}}>{stats.activeAdmins}</div>
          <div style={{fontSize: 12, color: '#2563eb'}}>Of {stats.totalAdmins} total admins</div>
        </div>
        
        <div className="card" style={{borderLeft: '4px solid #8b5cf6', padding: 20}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>TOTAL TENANTS</div>
          <div style={{fontSize: 36, fontWeight: 700, color: '#8b5cf6'}}>{stats.totalTenants}</div>
          <div style={{fontSize: 12, color: '#7c3aed'}}>Across all properties</div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32}}>
        <div className="card">
          <div style={{marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0, fontSize: 18}}>Recent Payments</h3>
            <span style={{fontSize: 12, color: 'var(--gray)'}}>Last 10</span>
          </div>
          
          {recentPayments.length === 0 ? (
            <div style={{textAlign: 'center', padding: 32, color: 'var(--gray)'}}>
              <div style={{fontSize: 32, marginBottom: 8}}>💰</div>
              <div>No payments yet</div>
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '2px solid var(--border)'}}>
                    <th style={{padding: '8px', textAlign: 'left', fontSize: 12}}>Admin</th>
                    <th style={{padding: '8px', textAlign: 'left', fontSize: 12}}>Amount</th>
                    <th style={{padding: '8px', textAlign: 'left', fontSize: 12}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '12px 8px'}}>
                        <div style={{fontWeight: 600, fontSize: 13}}>
                          {payment.admins?.name || 'Unknown'}
                        </div>
                        <div style={{fontSize: 11, color: 'var(--gray)'}}>
                          {formatDate(payment.date)}
                        </div>
                      </td>
                      <td style={{padding: '12px 8px', fontWeight: 600}}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td style={{padding: '12px 8px'}}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: payment.status === 'Confirmed' ? '#d1fae5' : '#fef3c7',
                          color: payment.status === 'Confirmed' ? '#059669' : '#d97706'
                        }}>
                          {payment.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0, fontSize: 18}}>Active Admins</h3>
            <span style={{fontSize: 12, color: 'var(--gray)'}}>Top 5</span>
          </div>
          
          {activeAdminsList.length === 0 ? (
            <div style={{textAlign: 'center', padding: 32, color: 'var(--gray)'}}>
              <div style={{fontSize: 32, marginBottom: 8}}>👥</div>
              <div>No active admins found.</div>
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '2px solid var(--border)'}}>
                    <th style={{padding: '8px', textAlign: 'left', fontSize: 12}}>Name</th>
                    <th style={{padding: '8px', textAlign: 'left', fontSize: 12}}>Plan</th>
                    <th style={{padding: '8px', textAlign: 'left', fontSize: 12}}>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdminsList.map((admin) => (
                    <tr key={admin.id} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '12px 8px'}}>
                        <div style={{fontWeight: 600, fontSize: 13}}>{admin.name || 'Unknown'}</div>
                        <div style={{fontSize: 11, color: 'var(--gray)'}}>{admin.email}</div>
                      </td>
                      <td style={{padding: '12px 8px'}}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#f3f4f6',
                          color: '#374151'
                        }}>
                          {admin.subscription_plan || 'Monthly'}
                        </span>
                      </td>
                      <td style={{padding: '12px 8px', fontWeight: 600}}>
                        {formatCurrency(admin.subscription_fee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}