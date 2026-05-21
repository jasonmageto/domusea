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

  if (loading) return <div style={{textAlign: 'center', padding: 40}}>Loading analytics...</div>;

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
        <div>
          <h2 style={{margin: 0}}>📈 Revenue Analytics</h2>
          <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>Track subscription revenue and growth trends</p>
        </div>
        <div style={{display: 'flex', gap: 10}}>
          <button onClick={downloadCSV} className="btn" style={{background: 'var(--green)', color: 'white'}}>📊 CSV</button>
          <button onClick={downloadPDF} className="btn" style={{background: 'var(--red)', color: 'white'}}>📄 PDF</button>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32}}>
        <div className="card" style={{borderLeft: '4px solid #3b82f6'}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>TOTAL REVENUE</div>
          <div style={{fontSize: 32, fontWeight: 700, color: '#3b82f6'}}>{formatCurrency(revenueData.totalRevenue)}</div>
        </div>
        <div className="card" style={{borderLeft: '4px solid #10b981'}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>AVERAGE MONTHLY</div>
          <div style={{fontSize: 32, fontWeight: 700, color: '#10b981'}}>{formatCurrency(revenueData.averageMonthly)}</div>
        </div>
        <div className="card" style={{borderLeft: '4px solid #f59e0b'}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 8, fontWeight: 600}}>GROWTH RATE</div>
          <div style={{fontSize: 32, fontWeight: 700, color: revenueData.growthRate >= 0 ? '#10b981' : '#ef4444'}}>
            {revenueData.growthRate >= 0 ? '↑' : '↓'} {Math.abs(revenueData.growthRate).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Revenue Summary</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16}}>
          <div style={{padding: 16, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8}}>
            <div style={{fontSize: 12, color: 'var(--green)', fontWeight: 600}}>CONFIRMED</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{revenueData.confirmedPayments}</div>
          </div>
          <div style={{padding: 16, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8}}>
            <div style={{fontSize: 12, color: 'var(--amber)', fontWeight: 600}}>PENDING</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{revenueData.pendingPayments}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
