import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, CheckCircle2, Clock, AlertTriangle, Users,
  Calculator, PieChart as PieChartIcon, BarChart3, ClipboardList, RefreshCcw
} from 'lucide-react';

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

      const tenantIds = tenants.map(t => t.id);
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, date, status, tenant_id')
        .in('tenant_id', tenantIds)
        .order('date', { ascending: true });

      if (paymentsError) throw paymentsError;

      const payments = paymentsData || [];

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

      const uniquePayingTenants = new Set(confirmed.map(p => p.tenant_id)).size;
      const averageRent = confirmedRevenue / (uniquePayingTenants || 1);
      const collectionRate = totalRevenue > 0 ? (confirmedRevenue / totalRevenue) * 100 : 0;

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
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#1e3a5f', '#8b5cf6'];

  if (loading) {
    return (
      <div className="dra-loading">
        <div className="dra-spinner"></div>
        <p>Loading revenue analytics…</p>
        <style>{draStyles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dra-error-card">
        <AlertTriangle size={40} className="dra-error-icon" />
        <h3>Couldn't load analytics</h3>
        <p>{error}</p>
        <button className="dra-retry-btn" onClick={() => fetchRevenueData()}>
          <RefreshCcw size={16} />
          Retry
        </button>
        <style>{draStyles}</style>
      </div>
    );
  }

  return (
    <div className="dra-page">
      <div className="dra-header">
        <div>
          <h1 className="dra-title">Revenue Analytics</h1>
          <p className="dra-subtitle">Track rental income and payment trends</p>
        </div>
      </div>

      <div className="dra-stats-grid">
        <div className="dra-stat-card">
          <div className="dra-stat-top">
            <div>
              <div className="dra-stat-label">Total Revenue</div>
              <div className="dra-stat-value">{formatCurrency(stats.totalRevenue)}</div>
            </div>
            <div className="dra-icon dra-icon-blue"><TrendingUp size={20} /></div>
          </div>
          <div className="dra-stat-sub">All time</div>
        </div>

        <div className="dra-stat-card dra-accent-green">
          <div className="dra-stat-top">
            <div>
              <div className="dra-stat-label">Confirmed</div>
              <div className="dra-stat-value dra-text-green">{formatCurrency(stats.confirmedRevenue)}</div>
            </div>
            <div className="dra-icon dra-icon-green"><CheckCircle2 size={20} /></div>
          </div>
          <div className="dra-stat-sub">{stats.collectionRate.toFixed(1)}% collection rate</div>
        </div>

        <div className="dra-stat-card dra-accent-amber">
          <div className="dra-stat-top">
            <div>
              <div className="dra-stat-label">Pending</div>
              <div className="dra-stat-value dra-text-amber">{formatCurrency(stats.pendingRevenue)}</div>
            </div>
            <div className="dra-icon dra-icon-amber"><Clock size={20} /></div>
          </div>
          <div className="dra-stat-sub">Awaiting confirmation</div>
        </div>

        <div className="dra-stat-card dra-accent-red">
          <div className="dra-stat-top">
            <div>
              <div className="dra-stat-label">Overdue</div>
              <div className="dra-stat-value dra-text-red">{formatCurrency(stats.overdueRevenue)}</div>
            </div>
            <div className="dra-icon dra-icon-red"><AlertTriangle size={20} /></div>
          </div>
          <div className="dra-stat-sub">Requires action</div>
        </div>

        <div className="dra-stat-card">
          <div className="dra-stat-top">
            <div>
              <div className="dra-stat-label">Active Tenants</div>
              <div className="dra-stat-value">
                {stats.payingTenants}<span className="dra-stat-muted">/{stats.totalTenants}</span>
              </div>
            </div>
            <div className="dra-icon dra-icon-purple"><Users size={20} /></div>
          </div>
          <div className="dra-stat-sub">Paying tenants</div>
        </div>

        <div className="dra-stat-card">
          <div className="dra-stat-top">
            <div>
              <div className="dra-stat-label">Avg Rent/Tenant</div>
              <div className="dra-stat-value dra-text-blue">{formatCurrency(Math.round(stats.averageRent))}</div>
            </div>
            <div className="dra-icon dra-icon-blue"><Calculator size={20} /></div>
          </div>
          <div className="dra-stat-sub">Per month</div>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="dra-card">
          <div className="dra-card-header">
            <TrendingUp size={18} />
            <h3>Monthly Revenue Trend</h3>
          </div>
          <div className="dra-card-body">
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary, #e5e7eb)" />
                <XAxis dataKey="month" stroke="var(--text-muted, #6b7280)" fontSize={12} />
                <YAxis stroke="var(--text-muted, #6b7280)" tickFormatter={formatYAxis} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb' }} />
                <Legend />
                <Area type="monotone" dataKey="Confirmed" stroke="#10b981" fillOpacity={1} fill="url(#colorConfirmed)" />
                <Area type="monotone" dataKey="Pending" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPending)" />
                <Area type="monotone" dataKey="Overdue" stroke="#ef4444" fillOpacity={0.3} fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tenantData.length > 0 && (
        <div className="dra-card">
          <div className="dra-card-header">
            <BarChart3 size={18} />
            <h3>Top 5 Paying Tenants</h3>
          </div>
          <div className="dra-card-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tenantData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary, #e5e7eb)" />
                <XAxis dataKey="name" stroke="var(--text-muted, #6b7280)" fontSize={12} />
                <YAxis stroke="var(--text-muted, #6b7280)" tickFormatter={formatYAxis} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {tenantData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="dra-content-grid">
        <div className="dra-card">
          <div className="dra-card-header">
            <PieChartIcon size={18} />
            <h3>Payment Status</h3>
          </div>
          <div className="dra-card-body">
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
              <div className="dra-empty">
                <PieChartIcon size={40} />
                <p>No payment data yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="dra-card">
          <div className="dra-card-header">
            <ClipboardList size={18} />
            <h3>Quick Stats</h3>
          </div>
          <div className="dra-card-body dra-quick-stats">
            <div className="dra-mini-stat">
              <p className="dra-mini-label">Collection Rate</p>
              <p className={`dra-mini-value ${stats.collectionRate >= 80 ? 'dra-text-green' : 'dra-text-amber'}`}>
                {stats.collectionRate.toFixed(1)}%
              </p>
              <p className="dra-mini-note">
                {stats.confirmedRevenue > 0 ? 'Excellent performance' : 'No payments yet'}
              </p>
            </div>

            <div className="dra-mini-stat">
              <p className="dra-mini-label">Outstanding Amount</p>
              <p className="dra-mini-value dra-text-red">
                {formatCurrency(stats.pendingRevenue + stats.overdueRevenue)}
              </p>
              <p className="dra-mini-note">Needs follow-up</p>
            </div>

            <div className="dra-mini-stat">
              <p className="dra-mini-label">Tenant Occupancy</p>
              <p className="dra-mini-value">
                {stats.totalTenants > 0 ? ((stats.payingTenants / stats.totalTenants) * 100).toFixed(0) : 0}%
              </p>
              <p className="dra-mini-note">
                {stats.payingTenants} of {stats.totalTenants} tenants active
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{draStyles}</style>
    </div>
  );
}

const draStyles = `
.dra-page {
  animation: draFadeIn 0.4s ease;
  color: #1f2937;
}

@keyframes draFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.dra-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}

.dra-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e3a5f;
  margin: 0;
  letter-spacing: -0.02em;
}

.dra-subtitle {
  color: #6b7280;
  margin: 4px 0 0;
  font-size: 0.925rem;
}

.dra-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.dra-stat-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 18px 20px;
  border: 1px solid #eef0f3;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  border-top: 3px solid #1e3a5f;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.dra-stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(16, 24, 40, 0.08);
}

.dra-accent-green { border-top-color: #10b981; }
.dra-accent-amber { border-top-color: #f59e0b; }
.dra-accent-red { border-top-color: #ef4444; }

.dra-stat-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dra-stat-label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.dra-stat-value {
  font-size: 1.45rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.dra-stat-muted {
  font-size: 1rem;
  color: #9ca3af;
  font-weight: 500;
}

.dra-stat-sub {
  font-size: 0.78rem;
  color: #9ca3af;
  margin-top: 10px;
}

.dra-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dra-icon-blue { background: rgba(30, 58, 95, 0.1); color: #1e3a5f; }
.dra-icon-green { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.dra-icon-amber { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.dra-icon-red { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
.dra-icon-purple { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }

.dra-text-green { color: #10b981; }
.dra-text-amber { color: #f59e0b; }
.dra-text-red { color: #ef4444; }
.dra-text-blue { color: #1e3a5f; }

.dra-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #eef0f3;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  margin-bottom: 20px;
  overflow: hidden;
}

.dra-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  color: #1e3a5f;
}

.dra-card-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.dra-card-body {
  padding: 16px 20px 20px;
}

.dra-content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.dra-quick-stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dra-mini-stat {
  background: #f9fafb;
  border-radius: 10px;
  padding: 14px 16px;
}

.dra-mini-label {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0 0 4px;
}

.dra-mini-value {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.dra-mini-note {
  font-size: 0.75rem;
  color: #9ca3af;
  margin: 4px 0 0;
}

.dra-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #9ca3af;
  padding: 40px 0;
}

.dra-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 260px;
  color: #6b7280;
}

.dra-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  border-top-color: #1e3a5f;
  animation: draSpin 0.8s linear infinite;
}

@keyframes draSpin {
  to { transform: rotate(360deg); }
}

.dra-error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #fee2e2;
}

.dra-error-icon { color: #ef4444; margin-bottom: 12px; }

.dra-error-card h3 {
  color: #ef4444;
  margin: 0 0 6px;
}

.dra-error-card p {
  color: #6b7280;
  margin: 0 0 16px;
}

.dra-retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1e3a5f;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.dra-retry-btn:hover { background: #16304f; }

@media (max-width: 640px) {
  .dra-header { flex-direction: column; align-items: flex-start; gap: 8px; }
  .dra-stats-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
}
`;
