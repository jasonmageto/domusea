import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

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
  const [monthlyData, setMonthlyData] = useState([]);
  const [adminBreakdown, setAdminBreakdown] = useState([]);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  async function fetchRevenueData() {
    try {
      setLoading(true);
      console.log('Fetching revenue analytics...');

      // Fetch all payments - simpler query first
      const { data: paymentsData, error } = await supabase
        .from('admin_to_sa_payments')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Raw payments data:', paymentsData);

      if (!paymentsData || paymentsData.length === 0) {
        console.log('No payments found');
        setLoading(false);
        return;
      }

      // Fetch admin details for each payment
      const paymentsWithAdmins = await Promise.all(
        paymentsData.map(async (payment) => {
          const { data: adminData } = await supabase
            .from('admins')
            .select('name, email')
            .eq('id', payment.admin_id)
            .single();
          
          return {
            ...payment,
            admins: adminData
          };
        })
      );

      console.log('Payments with admins:', paymentsWithAdmins);

      // Calculate metrics
      const confirmedPayments = paymentsWithAdmins.filter(p => p.status === 'Confirmed');
      const pendingPayments = paymentsWithAdmins.filter(p => p.status === 'Pending');

      const totalRevenue = confirmedPayments.reduce((sum, p) => {
        const amount = parseFloat(p.amount) || 0;
        return sum + amount;
      }, 0);

      // Group by month
      const monthlyGroups = {};
      const adminTotals = {};

      confirmedPayments.forEach(payment => {
        const date = new Date(payment.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = parseFloat(payment.amount) || 0;

        // Monthly grouping
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = 0;
        }
        monthlyGroups[monthKey] += amount;

        // Admin grouping
        const adminName = payment.admins?.name || 'Unknown Admin';
        if (!adminTotals[adminName]) {
          adminTotals[adminName] = 0;
        }
        adminTotals[adminName] += amount;
      });

      // Convert to arrays for charts
      const monthlyChartData = Object.entries(monthlyGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // Last 6 months
        .map(([month, revenue]) => ({
          month: formatMonth(month),
          revenue
        }));

      const adminChartData = Object.entries(adminTotals)
        .map(([name, value]) => ({
          name,
          value
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 admins

      // Calculate this month vs last month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const thisMonthData = confirmedPayments.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      
      const thisMonthRevenue = thisMonthData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      // Last month
      let lastMonthMonth = currentMonth - 1;
      let lastMonthYear = currentYear;
      if (lastMonthMonth < 0) {
        lastMonthMonth = 11;
        lastMonthYear--;
      }

      const lastMonthData = confirmedPayments.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === lastMonthMonth && d.getFullYear() === lastMonthYear;
      });

      const lastMonthRevenue = lastMonthData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      // Calculate growth rate
      let growthRate = 0;
      if (lastMonthRevenue > 0) {
        growthRate = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      } else if (thisMonthRevenue > 0) {
        growthRate = 100; // New revenue
      }

      // Calculate average monthly
      const numberOfMonths = Object.keys(monthlyGroups).length || 1;
      const averageMonthly = totalRevenue / numberOfMonths;

      setRevenueData({
        totalRevenue,
        averageMonthly,
        growthRate,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        confirmedPayments: confirmedPayments.length,
        pendingPayments: pendingPayments.length
      });

      setMonthlyData(monthlyChartData);
      setAdminBreakdown(adminChartData);

      console.log('Revenue stats calculated:', {
        totalRevenue,
        averageMonthly,
        growthRate,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue
      });

    } catch (error) {
      console.error('Error fetching revenue ', error);
      alert('Failed to load revenue analytics. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `KSh ${num.toLocaleString()}`;
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
  };

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: 40}}>
        <div style={{fontSize: 24, marginBottom: 16}}>📊</div>
        <div>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: 32}}>
        <h1 style={{margin: 0, fontSize: 28}}>📊 Revenue Analytics</h1>
        <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>Track subscription revenue and growth trends</p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        <div className="card" style={{borderLeft: '4px solid #3b82f6', padding: 20}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>TOTAL REVENUE</div>
          <div style={{fontSize: 36, fontWeight: 700, color: '#3b82f6'}}>{formatCurrency(revenueData.totalRevenue)}</div>
          <div style={{fontSize: 12, color: 'var(--gray)', marginTop: 4}}>All time</div>
        </div>

        <div className="card" style={{borderLeft: '4px solid #10b981', padding: 20}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>AVERAGE MONTHLY</div>
          <div style={{fontSize: 36, fontWeight: 700, color: '#10b981'}}>{formatCurrency(revenueData.averageMonthly)}</div>
          <div style={{fontSize: 12, color: 'var(--gray)', marginTop: 4}}>Per month</div>
        </div>

        <div className="card" style={{borderLeft: '4px solid #f59e0b', padding: 20}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>GROWTH RATE</div>
          <div style={{fontSize: 36, fontWeight: 700, color: revenueData.growthRate >= 0 ? '#10b981' : '#ef4444'}}>
            {revenueData.growthRate >= 0 ? '↑' : '↓'} {Math.abs(revenueData.growthRate).toFixed(1)}%
          </div>
          <div style={{fontSize: 12, color: 'var(--gray)', marginTop: 4}}>vs last month</div>
        </div>

        <div className="card" style={{borderLeft: '4px solid #8b5cf6', padding: 20}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>THIS MONTH</div>
          <div style={{fontSize: 36, fontWeight: 700, color: '#8b5cf6'}}>{formatCurrency(revenueData.thisMonth)}</div>
          <div style={{fontSize: 12, color: 'var(--gray)', marginTop: 4}}>
            {revenueData.confirmedPayments} payments confirmed
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="card" style={{padding: 20, marginBottom: 24}}>
        <h3 style={{margin: '0 0 20px 0', fontSize: 18}}>Revenue Summary</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16}}>
          <div style={{padding: 16, background: '#f0fdf4', borderRadius: 8, borderLeft: '4px solid #10b981'}}>
            <div style={{fontSize: 13, color: '#059669', fontWeight: 600, marginBottom: 4}}>CONFIRMED PAYMENTS</div>
            <div style={{fontSize: 24, fontWeight: 700, color: '#059669'}}>{revenueData.confirmedPayments}</div>
          </div>
          <div style={{padding: 16, background: '#fffbeb', borderRadius: 8, borderLeft: '4px solid #f59e0b'}}>
            <div style={{fontSize: 13, color: '#d97706', fontWeight: 600, marginBottom: 4}}>PENDING PAYMENTS</div>
            <div style={{fontSize: 24, fontWeight: 700, color: '#d97706'}}>{revenueData.pendingPayments}</div>
          </div>
          <div style={{padding: 16, background: '#eff6ff', borderRadius: 8, borderLeft: '4px solid #3b82f6'}}>
            <div style={{fontSize: 13, color: '#2563eb', fontWeight: 600, marginBottom: 4}}>LAST MONTH</div>
            <div style={{fontSize: 24, fontWeight: 700, color: '#2563eb'}}>{formatCurrency(revenueData.lastMonth)}</div>
          </div>
          <div style={{padding: 16, background: '#f5f3ff', borderRadius: 8, borderLeft: '4px solid #8b5cf6'}}>
            <div style={{fontSize: 13, color: '#7c3aed', fontWeight: 600, marginBottom: 4}}>THIS MONTH</div>
            <div style={{fontSize: 24, fontWeight: 700, color: '#7c3aed'}}>{formatCurrency(revenueData.thisMonth)}</div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {revenueData.totalRevenue > 0 && (
        <div style={{padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, fontSize: 13, color: 'var(--text)'}}>
          <strong>💡 Insights:</strong>
          <ul style={{margin: '8px 0 0 0', paddingLeft: 20}}>
            <li>Your average monthly revenue is {formatCurrency(revenueData.averageMonthly)}</li>
            {revenueData.growthRate > 0 && (
              <li>Revenue is growing by {revenueData.growthRate.toFixed(1)}% compared to last month 🎉</li>
            )}
            {revenueData.growthRate < 0 && (
              <li>Revenue decreased by {Math.abs(revenueData.growthRate).toFixed(1)}% compared to last month</li>
            )}
            {revenueData.growthRate === 0 && revenueData.thisMonth > 0 && (
              <li>Revenue is stable compared to last month</li>
            )}
          </ul>
        </div>
      )}

      {revenueData.totalRevenue === 0 && (
        <div style={{marginTop: 24, padding: 32, textAlign: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: 8}}>
          <div style={{fontSize: 48, marginBottom: 16}}>📈</div>
          <p style={{margin: 0, color: 'var(--gray)'}}>No revenue data yet. Payments will appear here once admins start renewing their subscriptions.</p>
        </div>
      )}
    </div>
  );
}