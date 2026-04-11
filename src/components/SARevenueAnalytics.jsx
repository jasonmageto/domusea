import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function SARevenueAnalytics() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [adminData, setAdminData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageMonthly, setAverageMonthly] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  async function fetchRevenueData() {
    try {
      // Fetch all confirmed payments
      const {  payments } = await supabase
        .from('admin_to_sa_payments')
        .select('amount, date, admin_id')
        .eq('status', 'Confirmed')
        .order('date', { ascending: true });

      if (!payments) {
        setLoading(false);
        return;
      }

      // Calculate total revenue
      const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      setTotalRevenue(total);

      // Group by month (last 12 months)
      const monthlyMap = {};
      const currentDate = new Date();
      
      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: 0,
          fullDate: date
        };
      }

      // Populate with actual data
      payments.forEach(payment => {
        const paymentDate = new Date(payment.date);
        const key = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap[key]) {
          monthlyMap[key].revenue += parseFloat(payment.amount);
        }
      });

      // Convert to array and calculate growth
      const monthlyArray = Object.values(monthlyMap);
      setMonthlyData(monthlyArray);

      // Calculate average monthly revenue
      const activeMonths = monthlyArray.filter(m => m.revenue > 0).length || 1;
      setAverageMonthly(total / activeMonths);

      // Calculate growth rate (last month vs current month)
      if (monthlyArray.length >= 2) {
        const lastMonth = monthlyArray[monthlyArray.length - 2].revenue;
        const currentMonth = monthlyArray[monthlyArray.length - 1].revenue;
        
        let growth = 0;
        if (lastMonth > 0) {
          growth = ((currentMonth - lastMonth) / lastMonth) * 100;
        } else if (currentMonth > 0) {
          growth = 100;
        }
        setGrowthRate(growth);
      }

      // Group by admin for pie chart
      const adminMap = {};
      payments.forEach(payment => {
        if (!adminMap[payment.admin_id]) {
          adminMap[payment.admin_id] = 0;
        }
        adminMap[payment.admin_id] += parseFloat(payment.amount);
      });

      // Fetch admin names
      const adminIds = Object.keys(adminMap);
      if (adminIds.length > 0) {
        const {  admins } = await supabase
          .from('admins')
          .select('id, name')
          .in('id', adminIds);

        const adminChartData = adminIds.map(id => {
          const admin = admins?.find(a => a.id === id);
          return {
            name: admin?.name || 'Unknown Admin',
            value: adminMap[id]
          };
        }).filter(item => item.value > 0);

        setAdminData(adminChartData);
      }

    } catch (error) {
      console.error('Error fetching revenue ', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return `KSh ${value.toLocaleString()}`;
  };

  const formatYAxis = (value) => {
    return `KSh ${(value / 1000).toFixed(0)}k`;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (loading) {
    return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading analytics...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: 24}}>
        <h2 style={{margin: 0}}>📊 Revenue Analytics</h2>
        <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>
          Track subscription revenue and growth trends
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid" style={{marginBottom: 24}}>
        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Total Revenue</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--blue)'}}>
            {formatCurrency(totalRevenue)}
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>All time</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Average Monthly</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--green)'}}>
            {formatCurrency(Math.round(averageMonthly))}
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>Per month</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Growth Rate</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: growthRate >= 0 ? 'var(--green)' : 'var(--red)'}}>
            {growthRate >= 0 ? '↑' : '↓'} {Math.abs(growthRate).toFixed(1)}%
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>Month over month</p>
        </div>

        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Active Admins</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0}}>
            {adminData.length}
          </p>
          <p style={{fontSize: 12, color: 'var(--gray)', margin: '4px 0 0 0'}}>Contributing this year</p>
        </div>
      </div>

      {/* Monthly Revenue Chart - Bar + Line */}
      <div className="card" style={{marginBottom: 24}}>
        <h3 style={{margin: '0 0 20px 0'}}>📈 Monthly Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart  data={monthlyData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--gray)" />
            <YAxis stroke="var(--gray)" tickFormatter={formatYAxis} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Admin - Pie Chart */}
      <div className="card" style={{marginBottom: 24}}>
        <h3 style={{margin: '0 0 20px 0'}}>💰 Revenue by Admin (Last 12 Months)</h3>
        {adminData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={adminData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {adminData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p style={{textAlign: 'center', color: 'var(--gray)', padding: 40}}>
            No revenue data available yet
          </p>
        )}
      </div>

      {/* Detailed Monthly Table */}
      <div className="card">
        <h3 style={{margin: '0 0 16px 0'}}>📋 Monthly Breakdown</h3>
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '2px solid var(--border)'}}>
              <th style={{padding: '12px 0'}}>Month</th>
              <th>Revenue</th>
              <th>vs Previous Month</th>
              <th>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((month, index) => {
              const prevMonth = index > 0 ? monthlyData[index - 1].revenue : 0;
              const change = prevMonth > 0 ? ((month.revenue - prevMonth) / prevMonth) * 100 : 0;
              const cumulative = monthlyData.slice(0, index + 1).reduce((sum, m) => sum + m.revenue, 0);
              
              return (
                <tr key={month.month} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '12px 0'}}>{month.month}</td>
                  <td>{formatCurrency(month.revenue)}</td>
                  <td>
                    {index === 0 ? (
                      <span style={{color: 'var(--gray)'}}>-</span>
                    ) : (
                      <span style={{color: change >= 0 ? 'var(--green)' : 'var(--red)'}}>
                        {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td>{formatCurrency(cumulative)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
