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
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, house, rent, due_date, status')
        .eq('admin_id', userProfile.id);

      if (tenantsError) throw tenantsError;

      const tenants = tenantsData || [];

      if (tenants.length === 0) {
        setStats({
          totalRevenue: 0, confirmedRevenue: 0, pendingRevenue: 0, overdueRevenue: 0,
          totalTenants: 0, payingTenants: 0, averageRent: 0, collectionRate: 0
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

      if (paymentsError) throw paymentsError;

      const payments = paymentsData || [];

      // Step 3: Calculate revenues
      const confirmed = payments.filter(p => p.status?.toLowerCase() === 'confirmed');
      const confirmedRevenue = confirmed.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const pending = payments.filter(p => p.status?.toLowerCase() === 'pending');
      const pendingRevenue = pending.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      let overdueRevenue = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      tenants.forEach(tenant => {
        if (!tenant.due_date) return;
        const dueDate = new Date(tenant.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const rentAmount = parseFloat(tenant.rent || 0);

        if (dueDate < today) {
          const hasPaid = payments.some(p => 
            p.tenant_id === tenant.id && p.status?.toLowerCase() === 'confirmed'
          );
          if (!hasPaid) overdueRevenue += rentAmount;
        }
      });

      const totalRevenue = confirmedRevenue + pendingRevenue + overdueRevenue;

      // Step 4: Monthly revenue breakdown
      const monthlyMap = {};
      const currentDate = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          confirmed: 0, pending: 0, overdue: 0, fullDate: date
        };
      }

      payments.forEach(payment => {
        const paymentDate = new Date(payment.date);
        const key = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyMap[key]) {
          const amount = parseFloat(payment.amount || 0);
          const status = payment.status?.toLowerCase();
          if (status === 'confirmed') monthlyMap[key].confirmed += amount;
          else if (status === 'pending') monthlyMap[key].pending += amount;
          else if (status === 'overdue') monthlyMap[key].overdue += amount;
        }
      });

      const monthlyArray = Object.values(monthlyMap).map(m => ({
        month: m.month,
        Confirmed: m.confirmed,
        Pending: m.pending,
        Overdue: m.overdue,
        Total: m.confirmed + m.pending + m.overdue
      }));

      // Step 5: Tenant payment distribution
      const tenantPaymentMap = {};
      payments.forEach(p => {
        if (p.status?.toLowerCase() === 'confirmed') {
          tenantPaymentMap[p.tenant_id] = (tenantPaymentMap[p.tenant_id] || 0) + parseFloat(p.amount || 0);
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

      // Step 6: Calculate final stats
      const uniquePayingTenants = new Set(confirmed.map(p => p.tenant_id)).size;
      const averageRent = confirmedRevenue / (uniquePayingTenants || 1);
      const collectionRate = totalRevenue > 0 ? (confirmedRevenue / totalRevenue) * 100 : 0;

      // Step 7: Update state
      setStats({
        totalRevenue, confirmedRevenue, pendingRevenue, overdueRevenue,
        totalTenants: tenants.length, payingTenants: uniquePayingTenants,
        averageRent, collectionRate
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

  const formatCurrency = (value) => `KSh ${parseFloat(value || 0).toLocaleString()}`;
  const formatYAxis = (value) => `KSh ${(value / 1000).toFixed(0)}k`;
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <h3 className="text-xl font-bold text-danger mb-2">Error Loading Analytics</h3>
        <p className="text-muted mb-4">{error}</p>
        <button className="btn btn-primary" onClick={() => fetchRevenueData()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue Analytics</h1>
          <p className="page-subtitle">Track rental income and payment trends</p>
        </div>
      </div>

      {/* Stats Grid - Using proper stats-grid class */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
            </div>
            <div className="stat-icon blue">
              <i className="fas fa-chart-line"></i>
            </div>
          </div>
          <div className="stat-subtitle">All time</div>
        </div>

        <div className="stat-card success">
          <div className="stat-header">
            <div>
              <div className="stat-label">Confirmed</div>
              <div className="stat-value text-success">{formatCurrency(stats.confirmedRevenue)}</div>
            </div>
            <div className="stat-icon green">
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
          <div className="stat-subtitle">{stats.collectionRate.toFixed(1)}% collection rate</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-header">
            <div>
              <div className="stat-label">Pending</div>
              <div className="stat-value text-warning">{formatCurrency(stats.pendingRevenue)}</div>
            </div>
            <div className="stat-icon orange">
              <i className="fas fa-clock"></i>
            </div>
          </div>
          <div className="stat-subtitle">Awaiting confirmation</div>
        </div>

        <div className="stat-card danger">
          <div className="stat-header">
            <div>
              <div className="stat-label">Overdue</div>
              <div className="stat-value text-danger">{formatCurrency(stats.overdueRevenue)}</div>
            </div>
            <div className="stat-icon red">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
          </div>
          <div className="stat-subtitle">Requires action</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Active Tenants</div>
              <div className="stat-value">
                {stats.payingTenants}<span className="text-muted">/{stats.totalTenants}</span>
              </div>
            </div>
            <div className="stat-icon purple">
              <i className="fas fa-users"></i>
            </div>
          </div>
          <div className="stat-subtitle">Paying tenants</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Avg Rent/Tenant</div>
              <div className="stat-value text-primary">{formatCurrency(Math.round(stats.averageRent))}</div>
            </div>
            <div className="stat-icon blue">
              <i className="fas fa-calculator"></i>
            </div>
          </div>
          <div className="stat-subtitle">Per month</div>
        </div>
      </div>

      {/* Monthly Revenue Trend Chart */}
      {monthlyData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📈 Monthly Revenue Trend</h3>
          </div>
          <div className="card-body">
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={formatYAxis} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="Confirmed" stroke="#10b981" fillOpacity={1} fill="url(#colorConfirmed)" />
                <Area type="monotone" dataKey="Pending" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPending)" />
                <Area type="monotone" dataKey="Overdue" stroke="#ef4444" fillOpacity={0.3} fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Paying Tenants Chart */}
      {tenantData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">💰 Top 5 Paying Tenants</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tenantData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={formatYAxis} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3b82f6">
                  {tenantData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom Grid: Pie Chart + Quick Stats */}
      <div className="content-grid">
        {/* Payment Status Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Payment Status</h3>
          </div>
          <div className="card-body">
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
              <div className="text-center text-muted py-8">
                <i className="fas fa-chart-pie" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block', opacity: 0.5 }}></i>
                No payment data yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 Quick Stats</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="p-4 bg-faint rounded-lg">
                <p className="text-sm text-muted mb-1">Collection Rate</p>
                <p className={`text-2xl font-bold ${stats.collectionRate >= 80 ? 'text-success' : 'text-warning'}`}>
                  {stats.collectionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted mt-1">
                  {stats.confirmedRevenue > 0 ? 'Excellent performance' : 'No payments yet'}
                </p>
              </div>

              <div className="p-4 bg-faint rounded-lg">
                <p className="text-sm text-muted mb-1">Outstanding Amount</p>
                <p className="text-2xl font-bold text-danger">
                  {formatCurrency(stats.pendingRevenue + stats.overdueRevenue)}
                </p>
                <p className="text-xs text-muted mt-1">Needs follow-up</p>
              </div>

              <div className="p-4 bg-faint rounded-lg">
                <p className="text-sm text-muted mb-1">Tenant Occupancy</p>
                <p className="text-2xl font-bold">
                  {stats.totalTenants > 0 ? ((stats.payingTenants / stats.totalTenants) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-muted mt-1">
                  {stats.payingTenants} of {stats.totalTenants} tenants active
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}