// src/components/PremiumPaymentsAnalytics.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

export default function PremiumPaymentsAnalytics() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activeSessions: 0,
    totalPayments: 0,
    totalSessions: 0,
    packagesSold: {},
    recentPayments: [],
    revenueByPackage: [],
    dailyRevenue: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days'); // 'today', '7days', '30days', 'all'

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date filter
      let dateFilter = '';
      const now = new Date();
      if (dateRange === 'today') {
        dateFilter = `AND created_at >= '${now.toISOString().split('T')[0]}T00:00:00Z'`;
      } else if (dateRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `AND created_at >= '${sevenDaysAgo.toISOString()}'`;
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `AND created_at >= '${thirtyDaysAgo.toISOString()}'`;
      }

      // 1. Total Revenue
      const { data: revenueData, error: revError } = await supabase
        .from('premium_payments')
        .select('amount_kes')
        .eq('status', 'confirmed')
        [dateFilter];
      
      const totalRevenue = revenueData?.reduce((sum, p) => sum + p.amount_kes, 0) || 0;

      // 2. Active Sessions
      const { data: activeData } = await supabase
        .from('premium_access_sessions')
        .select('id')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());
      
      const activeSessions = activeData?.length || 0;

      // 3. Total Payments & Sessions
      const { count: totalPayments } = await supabase
        .from('premium_payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        [dateFilter];

      const { count: totalSessions } = await supabase
        .from('premium_access_sessions')
        .select('*', { count: 'exact', head: true })
        [dateFilter];

      // 4. Packages Sold
      const { data: packagesData } = await supabase
        .from('premium_payments')
        .select('package_id')
        .eq('status', 'confirmed')
        [dateFilter];

      const packagesSold = {};
      packagesData?.forEach(p => {
        packagesSold[p.package_id] = (packagesSold[p.package_id] || 0) + 1;
      });

      // 5. Recent Payments (last 10)
      const { data: recentPayments } = await supabase
        .from('premium_payments')
        .select(`
          *,
          premium_packages (
            name
          )
        `)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(10)
        [dateFilter];

      // 6. Revenue by Package
      const { data: packageRevenue } = await supabase
        .from('premium_payments')
        .select(`
          package_id,
          amount_kes,
          premium_packages (
            name
          )
        `)
        .eq('status', 'confirmed')
        [dateFilter];

      const revenueByPackage = {};
      packageRevenue?.forEach(p => {
        const pkgName = p.premium_packages?.name || 'Unknown';
        revenueByPackage[pkgName] = (revenueByPackage[pkgName] || 0) + p.amount_kes;
      });

      // 7. Daily Revenue (last 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: dailyData } = await supabase
        .from('premium_payments')
        .select('created_at, amount_kes')
        .eq('status', 'confirmed')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const dailyRevenue = {};
      dailyData?.forEach(p => {
        const date = new Date(p.created_at).toLocaleDateString('en-KE', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        dailyRevenue[date] = (dailyRevenue[date] || 0) + p.amount_kes;
      });

      setMetrics({
        totalRevenue,
        activeSessions,
        totalPayments: totalPayments || 0,
        totalSessions: totalSessions || 0,
        packagesSold,
        recentPayments: recentPayments || [],
        revenueByPackage: Object.entries(revenueByPackage).map(([name, amount]) => ({ name, amount })),
        dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount }))
      });

    } catch (error) {
      console.error('Error loading premium analytics:', error);
      toast.error('Failed to load premium analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Premium Access Analytics</h2>
          <p className="text-muted">Track revenue and usage from premium map access</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="form-select"
          style={{ minWidth: '150px' }}
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card success">
          <div className="stat-header">
            <div>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value text-success">
                KSh {metrics.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="stat-icon green">
              <i className="fas fa-coins"></i>
            </div>
          </div>
          <div className="stat-subtitle">{metrics.totalPayments} payments</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Active Sessions</div>
              <div className="stat-value">{metrics.activeSessions}</div>
            </div>
            <div className="stat-icon blue">
              <i className="fas fa-users"></i>
            </div>
          </div>
          <div className="stat-subtitle">{metrics.totalSessions} total sessions</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-header">
            <div>
              <div className="stat-label">Avg Revenue/Session</div>
              <div className="stat-value text-warning">
                KSh {metrics.totalSessions > 0 ? Math.round(metrics.totalRevenue / metrics.totalSessions).toLocaleString() : 0}
              </div>
            </div>
            <div className="stat-icon orange">
              <i className="fas fa-chart-line"></i>
            </div>
          </div>
          <div className="stat-subtitle">Per session average</div>
        </div>

        <div className="stat-card info">
          <div className="stat-header">
            <div>
              <div className="stat-label">Conversion Rate</div>
              <div className="stat-value text-info">
                {metrics.totalPayments > 0 ? ((metrics.activeSessions / metrics.totalPayments) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="stat-icon blue">
              <i className="fas fa-percentage"></i>
            </div>
          </div>
          <div className="stat-subtitle">Active vs Total</div>
        </div>
      </div>

      {/* Revenue by Package */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Revenue by Package</h3>
        </div>
        <div className="card-body">
          {metrics.revenueByPackage.length === 0 ? (
            <div className="text-center text-muted py-8">
              <i className="fas fa-chart-bar" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block', opacity: 0.5 }}></i>
              No revenue data available
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.revenueByPackage.map((pkg, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-faint rounded">
                  <div className="font-semibold">{pkg.name}</div>
                  <div className="text-primary font-bold">KSh {pkg.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Revenue Chart (Simple Bar) */}
      {metrics.dailyRevenue.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Daily Revenue (Last 7 Days)</h3>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {metrics.dailyRevenue.map((day, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="text-sm text-muted" style={{ width: '120px' }}>{day.date}</div>
                  <div className="flex-1 bg-faint rounded-full overflow-hidden" style={{ height: '24px' }}>
                    <div 
                      className="bg-primary h-full transition-all"
                      style={{ 
                        width: `${Math.min((day.amount / Math.max(...metrics.dailyRevenue.map(d => d.amount))) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="font-semibold text-primary" style={{ width: '100px', textAlign: 'right' }}>
                    KSh {day.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Payments */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Premium Payments</h3>
        </div>
        <div className="card-body">
          {metrics.recentPayments.length === 0 ? (
            <div className="text-center text-muted py-8">
              <i className="fas fa-receipt" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block', opacity: 0.5 }}></i>
              No recent payments
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Transaction Ref</th>
                    <th>Package</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="font-mono text-xs">{payment.transaction_ref}</td>
                      <td>{payment.premium_packages?.name || 'N/A'}</td>
                      <td className="font-bold text-success">KSh {payment.amount_kes.toLocaleString()}</td>
                      <td className="capitalize">{payment.payment_method}</td>
                      <td>{new Date(payment.created_at).toLocaleString()}</td>
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