import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function SADashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({ totalAdmins: 0, totalTenants: 0, monthlyRevenue: 0, growthRate: 0, pendingPayments: 0 });
  const [admins, setAdmins] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  async function fetchDashboardData() {
    try {
      const { count: adminCount } = await supabase.from('admins').select('*', { count: 'exact', head: true });
      const { count: tenantCount } = await supabase.from('tenants').select('*', { count: 'exact', head: true });
      
      const {  payments } = await supabase.from('admin_to_sa_payments').select('amount, status, date').eq('status', 'Confirmed');
      
      // 🎯 FILTER: Only active, non-frozen admins
      const {  adminsData } = await supabase
        .from('admins')
        .select('subscription_status, subscription_due, subscription_fee, name, email, tenant_limit, frozen')
        .eq('frozen', false)
        .eq('subscription_status', 'Active');

      const { data: activityData } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10);

      const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const pendingPayments = payments?.filter(p => p.status === 'Pending').length || 0;
      
      // Monthly & Growth calc
      const now = new Date();
      const currentMonth = payments?.filter(p => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }) || [];
      const monthlyRevenue = currentMonth.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      const prevMonth = payments?.filter(p => { const d = new Date(p.date); const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1; const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(); return d.getMonth() === pm && d.getFullYear() === py; }) || [];
      const prevRevenue = prevMonth.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const growthRate = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : monthlyRevenue > 0 ? 100 : 0;

      setStats({ totalAdmins: adminCount || 0, totalTenants: tenantCount || 0, monthlyRevenue, growthRate, pendingPayments });
      setAdmins(adminsData || []);
      setRecentActivity(activityData || []);
    } catch (error) { console.error('Dashboard error:', error); } finally { setLoading(false); }
  }

  const formatCurrency = (amt) => `KSh ${parseFloat(amt || 0).toLocaleString()}`;

  if (loading) return <div className="card" style={{textAlign:'center', padding:40}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom:24}}><h2 style={{margin:0}}>🏠 DomusEA Dashboard</h2><p style={{color:'var(--gray)', margin:'4px 0 0'}}>Welcome, {userProfile?.name}</p></div>
      
      <div className="grid" style={{marginBottom:24}}>
        <div className="card"><h3 style={{margin:'0 0 8px', color:'var(--gray)', fontSize:14}}>Active Admins</h3><p style={{fontSize:32, fontWeight:700, margin:0}}>{stats.totalAdmins}</p></div>
        <div className="card"><h3 style={{margin:'0 0 8px', color:'var(--gray)', fontSize:14}}>Total Tenants</h3><p style={{fontSize:32, fontWeight:700, margin:0}}>{stats.totalTenants}</p></div>
        <div className="card"><h3 style={{margin:'0 0 8px', color:'var(--gray)', fontSize:14}}>Monthly Revenue</h3><p style={{fontSize:32, fontWeight:700, margin:0, color:'var(--green)'}}>{formatCurrency(stats.monthlyRevenue)}</p><p style={{fontSize:12, color: stats.growthRate >= 0 ? 'var(--green)' : 'var(--red)'}}>{stats.growthRate >= 0 ? '↑' : '↓'} {Math.abs(stats.growthRate).toFixed(1)}% vs last month</p></div>
        <div className="card"><h3 style={{margin:'0 0 8px', color:'var(--gray)', fontSize:14}}>Pending Payments</h3><p style={{fontSize:32, fontWeight:700, margin:0, color:'var(--amber)'}}>{stats.pendingPayments}</p></div>
      </div>

      <div className="card" style={{marginBottom:24}}>
        <h3 style={{margin:'0 0 16px 0'}}>Active Admins</h3>
        {admins.length === 0 ? <p style={{color:'var(--gray)'}}>No active admins found.</p> : (
          <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid var(--border)'}}><th style={{padding:'8px 0'}}>Name</th><th>Email</th><th>Plan</th><th>Status</th></tr></thead>
            <tbody>{admins.slice(0,5).map(a => <tr key={a.id} style={{borderBottom:'1px solid var(--border)'}}><td style={{padding:'12px 0'}}>{a.name}</td><td>{a.email}</td><td>{a.subscription_plan}</td><td><span className="badge status-green">Active</span></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}