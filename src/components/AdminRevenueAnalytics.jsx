import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function AdminRevenueAnalytics() {
  const { userProfile } = useAuth();
  const [monthlyData, setMonthlyData] = useState([]);
  const [tenantData, setTenantData] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    confirmedRevenue: 0,
    pendingRevenue: 0,
    overdueRevenue: 0,
    totalTenants: 0,
    payingTenants: 0,
    averageRent: 0,
    collectionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userProfile?.id) {
      fetchRevenueData();
    }
  }, [userProfile]);

  async function fetchRevenueData() {
    try {
      console.log('📊 Fetching revenue data for admin:', userProfile?.id);
      setError(null);

      if (!userProfile?.id) {
        console.error('❌ userProfile.id not available');
        setError('User profile not loaded');
        setLoading(false);
        return;
      }

      // Step 1: Fetch all tenants with their due dates and rent amounts
      console.log('📥 Querying tenants for admin_id:', userProfile.id);
      
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, house, rent, due_date, status')
        .eq('admin_id', userProfile.id);

      if (tenantsError) {
        console.error('❌ Error fetching tenants:', tenantsError);
        throw tenantsError;
      }

      const tenants = tenantsData || [];
      console.log(`✅ Found ${tenants.length} tenants`);

      if (tenants.length === 0) {
        console.log('⚠️ No tenants found');
        setStats({
          totalRevenue: 0,
          confirmedRevenue: 0,
          pendingRevenue: 0,
          overdueRevenue: 0,
          totalTenants: 0,
          payingTenants: 0,
          averageRent: 0,
          collectionRate: 0
        });
        setLoading(false);
        return;
      }

      // Step 2: Fetch all payments for these tenants
      const tenantIds = tenants.map(t => t.id);
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, date, status, tenant_id')
        .in('tenant_id', tenantIds)
        .order('date', { ascending: true });

      if (paymentsError) {
        console.error('❌ Error fetching payments:', paymentsError);
        throw paymentsError;
      }

      const payments = paymentsData || [];
      console.log(`✅ Found ${payments.length} payments`);

      // Step 3: Calculate revenues
      
      // Confirmed Revenue (Paid)
      const confirmed = payments.filter(p => p.status?.toLowerCase() === 'confirmed');
      const confirmedRevenue = confirmed.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      // Pending Revenue (Submitted but not confirmed)
      const pending = payments.filter(p => p.status?.toLowerCase() === 'pending');
      const pendingRevenue = pending.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      // Overdue Revenue - Calculate from tenant due dates (matches Occupancy Grid logic)
      let overdueRevenue = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      tenants.forEach(tenant => {
        if (!tenant.due_date) return;
        
        const dueDate = new Date(tenant.due_date);
        dueDate.setHours(0, 0, 0, 0); // Start of due date
        const rentAmount = parseFloat(tenant.rent || 0);

        // Check if due date has passed
        if (dueDate < today) {
          // Check if tenant has a confirmed payment for this period
          const hasPaid = payments.some(p => 
            p.tenant_id === tenant.id && 
            p.status?.toLowerCase() === 'confirmed'
          );

          // If no confirmed payment, add rent to overdue
          if (!hasPaid) {
            overdueRevenue += rentAmount;
          }
        }
      });

      const totalRevenue = confirmedRevenue + pendingRevenue + overdueRevenue;

      console.log('💰 Revenue breakdown:', {
        confirmed: confirmedRevenue,
        pending: pendingRevenue,
        overdue: overdueRevenue,
        total: totalRevenue
      });

      // Step 4: Monthly revenue breakdown (last 12 months)
      const monthlyMap = {};
      const currentDate = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          confirmed: 0,
          pending: 0,
          overdue: 0,
          fullDate: date
        };
      }

      payments.forEach(payment => {
        const paymentDate = new Date(payment.date);
        const key = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyMap[key]) {
          const amount = parseFloat(payment.amount || 0);
          const status = payment.status?.toLowerCase();
          
          if (status === 'confirmed') {
            monthlyMap[key].confirmed += amount;
          } else if (status === 'pending') {
            monthlyMap[key].pending += amount;
          } else if (status === 'overdue') {
            monthlyMap[key].overdue += amount;
          }
        }
      });

      const monthlyArray = Object.values(monthlyMap).map(m => ({
        month: m.month,
        Confirmed: m.confirmed,
        Pending: m.pending,
        Overdue: m.overdue,
        Total: m.confirmed + m.pending + m.overdue
      }));

      console.log('📊 Monthly data:', monthlyArray);

      // Step 5: Tenant payment distribution (top 5 payers)
      const tenantPaymentMap = {};
      payments.forEach(p => {
        if (p.status?.toLowerCase() === 'confirmed') {
          if (!tenantPaymentMap[p.tenant_id]) {
            tenantPaymentMap[p.tenant_id] = 0;
          }
          tenantPaymentMap[p.tenant_id] += parseFloat(p.amount || 0);
        }
      });

      const tenantChartData = Object.entries(tenantPaymentMap)
        .map(([tenantId, amount]) => {
          const tenant = tenants.find(t => t.id === tenantId);
          return {
            name: tenant?.name || tenant?.house || `Unit ${tenantId.slice(0, 4)}`,
            value: amount
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      console.log('🏆 Top paying tenants:', tenantChartData);

      // Step 6: Calculate final stats
      const uniquePayingTenants = new Set(confirmed.map(p => p.tenant_id)).size;
      const averageRent = confirmedRevenue / (uniquePayingTenants || 1);
      const collectionRate = totalRevenue > 0 ? (confirmedRevenue / totalRevenue) * 100 : 0;

      // Step 7: Update state
      setStats({
        totalRevenue,
        confirmedRevenue,
        pendingRevenue,
        overdueRevenue,
        totalTenants: tenants.length,
        payingTenants: uniquePayingTenants,
        averageRent,
        collectionRate
      });

      setMonthlyData(monthlyArray);
      setTenantData(tenantChartData);

    } catch (err) {
      console.error('❌ Error in fetchRevenueData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return `KSh ${parseFloat(value || 0).toLocaleString()}`;
  };

  const formatYAxis = (value) => {
    return `KSh ${(value / 1000).toFixed(0)}k`;
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  if (loading) {
    return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="card" style={{textAlign: 'center', padding: 40, color: 'var(--red)'}}>
        <h3>Error Loading Analytics</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => fetchRevenueData()} style={{marginTop: 16}}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: 24}}>
        <h2 style={{margin: 0}}>📊 Revenue Analytics</h2>
        <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>
          Track rental income and payment trends
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid" style={{marginBottom: 24}}>
        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Total Revenue</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--blue)'}}>
            {formatCurrency(stats.totalRevenue)}
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>All time</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Confirmed</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--green)'}}>
            {formatCurrency(stats.confirmedRevenue)}
          </p>
          <p style={{fontSize: 12, color: 'var(--green)', margin: '4px 0 0 0'}}>
            {stats.collectionRate.toFixed(1)}% collection rate
          </p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Pending</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--amber)'}}>
            {formatCurrency(stats.pendingRevenue)}
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>Awaiting confirmation</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Overdue</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--red)'}}>
            {formatCurrency(stats.overdueRevenue)}
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>Requires action</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Active Tenants</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0}}>
            {stats.payingTenants}<span style={{fontSize: 16, color: 'var(--gray)'}}>/<span style={{fontSize: 16}}>{stats.totalTenants}</span></span>
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>Paying tenants</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Avg Rent/Tenant</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--primary)'}}>
            {formatCurrency(Math.round(stats.averageRent))}
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>Per month</p>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      {monthlyData.length > 0 && (
        <div className="card" style={{marginBottom: 24}}>
          <h3 style={{margin: '0 0 20px 0'}}>📈 Monthly Revenue Trend (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--gray)" />
              <YAxis stroke="var(--gray)" tickFormatter={formatYAxis} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="Confirmed" stroke="#10b981" fillOpacity={1} fill="url(#colorConfirmed)" />
              <Area type="monotone" dataKey="Pending" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPending)" />
              <Area type="monotone" dataKey="Overdue" stroke="#ef4444" fillOpacity={0.3} fill="#ef4444" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Paying Tenants */}
      {tenantData.length > 0 && (
        <div className="card" style={{marginBottom: 24}}>
          <h3 style={{margin: '0 0 20px 0'}}>💰 Top 5 Paying Tenants (All Time)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tenantData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--gray)" />
              <YAxis stroke="var(--gray)" tickFormatter={formatYAxis} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#3b82f6">
                {tenantData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment Status Breakdown */}
      <div className="grid" style={{gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24}}>
        <div className="card">
          <h3 style={{margin: '0 0 20px 0'}}>📊 Payment Status Distribution</h3>
          {stats.totalRevenue > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Confirmed', value: stats.confirmedRevenue },
                    { name: 'Pending', value: stats.pendingRevenue },
                    { name: 'Overdue', value: stats.overdueRevenue }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{textAlign: 'center', color: 'var(--gray)', padding: 40}}>No payment data yet</p>
          )}
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 20px 0'}}>📋 Quick Stats</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={{padding: 16, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)'}}>
              <p style={{margin: 0, fontSize: 12, color: 'var(--gray)'}}>Collection Rate</p>
              <p style={{margin: '4px 0 0 0', fontSize: 24, fontWeight: 700, color: stats.collectionRate >= 80 ? 'var(--green)' : 'var(--amber)'}}>
                {stats.collectionRate.toFixed(1)}%
              </p>
              <p style={{margin: '4px 0 0 0', fontSize: 12, color: 'var(--gray)'}}>
                {stats.confirmedRevenue > 0 ? 'Excellent performance' : 'No payments yet'}
              </p>
            </div>

            <div style={{padding: 16, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)'}}>
              <p style={{margin: 0, fontSize: 12, color: 'var(--gray)'}}>Outstanding Amount</p>
              <p style={{margin: '4px 0 0 0', fontSize: 24, fontWeight: 700, color: 'var(--red)'}}>
                {formatCurrency(stats.pendingRevenue + stats.overdueRevenue)}
              </p>
              <p style={{margin: '4px 0 0 0', fontSize: 12, color: 'var(--gray)'}}>
                Needs follow-up
              </p>
            </div>

            <div style={{padding: 16, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)'}}>
              <p style={{margin: 0, fontSize: 12, color: 'var(--gray)'}}>Tenant Occupancy</p>
              <p style={{margin: '4px 0 0 0', fontSize: 24, fontWeight: 700}}>
                {stats.totalTenants > 0 ? ((stats.payingTenants / stats.totalTenants) * 100).toFixed(0) : 0}%
              </p>
              <p style={{margin: '4px 0 0 0', fontSize: 12, color: 'var(--gray)'}}>
                {stats.payingTenants} of {stats.totalTenants} tenants active
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}