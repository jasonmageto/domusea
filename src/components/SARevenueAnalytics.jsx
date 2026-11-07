import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { exportToPDF } from '../utils/pdfExport';

export default function SARevenueAnalytics() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    averageMonthly: 0,
    growthRate: 0,
    thisMonth: 0,
    lastMonth: 0,
    confirmedPayments: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    fetchRevenueData();
  }, []);

  async function fetchRevenueData() {
    try {
      setLoading(true);
      const { data: paymentsData, error } = await supabase
        .from('admin_to_sa_payments')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      if (!paymentsData || paymentsData.length === 0) {
        setLoading(false);
        return;
      }

      const confirmedPayments = paymentsData.filter(p => p.status === 'Confirmed');
      const totalRevenue = confirmedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonthRevenue = confirmedPayments
        .filter(p => {
          const d = new Date(p.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const lastMonthRevenue = confirmedPayments
        .filter(p => {
          const d = new Date(p.date);
          return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        })
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const growthRate = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : (thisMonthRevenue > 0 ? 100 : 0);
      const monthlyGroups = {};
      confirmedPayments.forEach(p => {
        const d = new Date(p.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyGroups[key] = true;
      });
      const numberOfMonths = Object.keys(monthlyGroups).length || 1;

      setRevenueData({
        totalRevenue,
        averageMonthly: totalRevenue / numberOfMonths,
        growthRate,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        confirmedPayments: confirmedPayments.length,
        pendingPayments: paymentsData.filter(p => p.status === 'Pending').length
      });
    } catch (error) {
      console.error('Error fetching revenue ', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => `KSh ${parseFloat(amount || 0).toLocaleString()}`;

  const downloadCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Revenue', formatCurrency(revenueData.totalRevenue)],
      ['Average Monthly', formatCurrency(revenueData.averageMonthly)],
      ['Growth Rate', `${revenueData.growthRate.toFixed(1)}%`],
      ['This Month Revenue', formatCurrency(revenueData.thisMonth)],
      ['Last Month Revenue', formatCurrency(revenueData.lastMonth)],
      ['Confirmed Payments Count', revenueData.confirmedPayments],
      ['Pending Payments Count', revenueData.pendingPayments]
    ];
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadPDF = () => {
    const headers = ['Metric', 'Performance Value'];
    const data = [
      ['Total Accumulated Revenue', formatCurrency(revenueData.totalRevenue)],
      ['Average Monthly Revenue', formatCurrency(revenueData.averageMonthly)],
      ['Current Growth Rate', `${revenueData.growthRate.toFixed(1)}%`],
      ['This Month Collection', formatCurrency(revenueData.thisMonth)],
      ['Last Month Collection', formatCurrency(revenueData.lastMonth)],
      ['Total Confirmed Transactions', revenueData.confirmedPayments.toString()]
    ];
    exportToPDF({
      title: 'Supreme Admin Revenue Analytics Report',
      filename: 'Revenue_Analytics_Report',
      headers,
      data,
      subtitle: `Report Generated On: ${new Date().toLocaleString()}`
    });
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <div>Loading analytics...</div>
      </div>
    );
  }

  const isPositiveGrowth = revenueData.growthRate >= 0;

  return (
    <div className="dashboard-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">📈 Revenue Analytics</h2>
          <p className="page-subtitle">Track subscription revenue and growth trends</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* ✅ FIX: var(--green)/var(--red) don't exist in the stylesheet
              (it's --success/--danger), which left these buttons with no
              background. Using the real .btn-success/.btn-danger classes. */}
          <button onClick={downloadCSV} className="btn btn-success btn-sm">📊 CSV</button>
          <button onClick={downloadPDF} className="btn btn-danger btn-sm">📄 PDF</button>
        </div>
      </div>

      {/* Stat cards — reusing the app's real .stat-card system instead of
          one-off inline-styled divs, so this matches every other dashboard
          page and themes correctly in dark mode. */}
      <div className="stats-grid">
        <div className="stat-card info">
          <div className="stat-header">
            <div>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">{formatCurrency(revenueData.totalRevenue)}</div>
            </div>
            <div className="stat-icon blue">💰</div>
          </div>
          <div className="stat-subtitle">All confirmed payments to date</div>
        </div>

        <div className="stat-card success">
          <div className="stat-header">
            <div>
              <div className="stat-label">Average Monthly</div>
              <div className="stat-value">{formatCurrency(revenueData.averageMonthly)}</div>
            </div>
            <div className="stat-icon green">📅</div>
          </div>
          <div className="stat-subtitle">Averaged across active months</div>
        </div>

        <div className={`stat-card ${isPositiveGrowth ? 'success' : 'danger'}`}>
          <div className="stat-header">
            <div>
              <div className="stat-label">Growth Rate</div>
              <div
                className="stat-value"
                style={{ color: isPositiveGrowth ? 'var(--success)' : 'var(--danger)' }}
              >
                {isPositiveGrowth ? '↑' : '↓'} {Math.abs(revenueData.growthRate).toFixed(1)}%
              </div>
            </div>
            <div className={`stat-icon ${isPositiveGrowth ? 'green' : 'red'}`}>
              {isPositiveGrowth ? '📈' : '📉'}
            </div>
          </div>
          <div className="stat-subtitle">
            {formatCurrency(revenueData.thisMonth)} this month vs {formatCurrency(revenueData.lastMonth)} last month
          </div>
        </div>
      </div>

      {/* Summary card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Revenue Summary</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Confirmed
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>
                {revenueData.confirmedPayments}
              </div>
            </div>
            <div style={{ padding: 16, background: 'var(--warning-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>
                {revenueData.pendingPayments}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
