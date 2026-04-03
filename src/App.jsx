import { useState, useEffect } from 'react';

// --- MOCK DATA ---
const MOCK = {
  users: { sa: { name: 'Supreme Admin', role: 'sa', frozen: false },
           admin: { name: 'Property Admin', role: 'admin', frozen: false, tenantLimit: 50, tenantCount: 32, sub: { plan: 'Monthly', fee: 'KSh 2,500', due: '2026-05-01', status: 'Active' } },
           tenant: { name: 'John Doe', role: 'tenant', frozen: false, status: 'good', dueDate: '2026-04-10', rent: 15000, lastPay: { amt: 15000, date: '2026-03-05' } } },
  tenants: [
    { id: 1, name: 'Alice M.', house: 'A1', status: 'good', rent: 12000 },
    { id: 2, name: 'Bob K.', house: 'B3', status: 'pending', rent: 15000 },
    { id: 3, name: 'Carol N.', house: 'C2', status: 'overdue', rent: 18000 },
  ],
  announcements: [{ id: 1, subject: 'System Maintenance', message: 'Scheduled for April 10', priority: 'Important' }]
};

// --- UTILS ---
const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const statusColor = (s) => s === 'good' ? 'status-green' : s === 'pending' ? 'status-amber' : 'status-red';

// --- COMPONENTS ---
const Login = ({ onLogin, isDark }) => {
  const [role, setRole] = useState('admin');
  const [frozen, setFrozen] = useState(false);
  return (
    <div className="login-box card">
      <h2>🏢 DomusEA Login</h2>
      <p style={{color:'var(--gray)', margin:'12px 0'}}>Select a role to preview the dashboard</p>
      <select value={role} onChange={e=>setRole(e.target.value)} style={{padding:8, width:'100%', marginBottom:12, borderRadius:4}}>
        <option value="sa">Supreme Admin</option>
        <option value="admin">Property Admin</option>
        <option value="tenant">Tenant</option>
      </select>
      {frozen && <div className="card" style={{background:'var(--red)', color:'white', marginBottom:12}}>❄️ Account Frozen</div>}
      <button className="btn btn-primary" style={{width:'100%'}} onClick={()=>{
        setFrozen(MOCK.users[role].frozen);
        if(!MOCK.users[role].frozen) onLogin(role);
      }}>Log In</button>
      <button className="btn" style={{marginTop:8, background:'var(--border)'}} onClick={()=>document.body.classList.toggle('dark')}>{isDark ? '☀️ Light' : '🌙 Dark'}</button>
    </div>
  );
};

const Sidebar = ({ role, active, onNav, toggleTheme, isDark, mobileOpen, setMobile }) => {
  const links = { sa: ['Dashboard', 'Manage Admins', 'Subscriptions', 'Announcements', 'Activity Log'],
                admin: ['Dashboard', 'Tenants', 'Payments', 'Complaints', 'Messages', 'Settings'],
                tenant: ['Dashboard', 'Pay Rent', 'History', 'Requests', 'Messages', 'Tips'] };
  return (
    <>
      <div className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <h3 style={{marginBottom:16}}>🏠 DomusEA</h3>
        {links[role].map(l => <button key={l} className={`nav-btn ${active===l?'active':''}`} onClick={()=>onNav(l)}>{l}</button>)}
        <button className="btn" style={{marginTop:'auto', background:'transparent', border:'1px solid var(--border)'}} onClick={toggleTheme}>{isDark?'☀️':'🌙'} Theme</button>
        <button className="btn" style={{marginTop:8, background:'var(--red)', color:'white'}} onClick={()=>window.location.reload()}>Logout</button>
      </div>
      {mobileOpen && <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:40}} onClick={()=>setMobile(false)}/>}
    </>
  );
};

const SADashboard = () => (
  <div>
    <h2>Supreme Admin Dashboard</h2>
    <div className="grid" style={{marginTop:16}}>
      <div className="card"><h3>Admins</h3><p>12 Active</p></div>
      <div className="card"><h3>Tenants System-wide</h3><p>482</p></div>
      <div className="card"><h3>Revenue (Admin Subscriptions)</h3><p className="status-green">KSh 34,200</p></div>
    </div>
    <div className="card" style={{marginTop:16}}><h3>Recent Announcements</h3>{MOCK.announcements.map(a=><div key={a.id}><strong>{a.subject}</strong> <span className="badge">{a.priority}</span><p>{a.message}</p></div>)}</div>
  </div>
);

const AdminDashboard = () => {
  const u = MOCK.users.admin;
  return (
    <div>
      <h2>Property Admin Dashboard</h2>
      <div className="grid" style={{marginTop:16}}>
        <div className="card"><h3>Occupancy</h3><p>{u.tenantCount}/{u.tenantLimit} Units</p></div>
        <div className="card"><h3>Subscription</h3><p>{u.sub.plan} • {u.sub.status} • Due {u.sub.due}</p></div>
        <div className="card"><h3>Quick Action</h3><button className="btn btn-primary">Send Bulk Reminders</button></div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <h3>Tenant Overview</h3>
        <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'1px solid var(--border)'}}><th>Name</th><th>House</th><th>Rent</th><th>Status</th></tr></thead>
          <tbody>{MOCK.tenants.map(t=><tr key={t.id} style={{borderBottom:'1px solid var(--border)'}}>
            <td style={{padding:'8px 0'}}>{t.name}</td><td>{t.house}</td><td>KSh {t.rent}</td><td className={statusColor(t.status)}>{t.status.toUpperCase()}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

const TenantDashboard = () => {
  const t = MOCK.users.tenant;
  const days = daysLeft(t.dueDate);
  const urgent = days <= 3 || days < 0;
  return (
    <div>
      <h2>Welcome, {t.name}</h2>
      {urgent && <div className="card" style={{borderLeft:`4px solid var(--red)`, background:'rgba(239,68,68,0.1)'}}>⚠️ Rent {days<0?'OVERDUE by '+Math.abs(days)+' days':'DUE in '+days+' days'}</div>}
      <div className="grid" style={{marginTop:16}}>
        <div className="card"><h3>Current Status</h3><p className={statusColor(t.status)}>{t.status.toUpperCase()}</p></div>
        <div className="card"><h3>Amount Due</h3><p style={{fontSize:24, fontWeight:700}}>KSh {t.rent}</p></div>
        <div className="card"><h3>Last Payment</h3><p>KSh {t.lastPay.amt} on {t.lastPay.date}</p></div>
      </div>
      <button className="btn btn-primary" style={{marginTop:16, padding:'12px 24px', fontSize:16}}>💳 Pay Rent Now</button>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('Dashboard');
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => { if(deferredPrompt) deferredPrompt.prompt(); };

  if (!user) return <Login onLogin={r=>setUser(MOCK.users[r])} isDark={isDark} />;

  return (
    <div className={isDark?'dark':''}>
      <div className="mobile-header">
        <button className="btn" onClick={()=>setMobile(true)}>☰ Menu</button>
        <span>DomusEA</span>
        <button className="btn" onClick={()=>window.location.reload()}>Logout</button>
      </div>
      <div className="app">
        <Sidebar role={user.role} active={page} onNav={p=>{setPage(p); setMobile(false)}} toggleTheme={()=>setIsDark(!isDark)} isDark={isDark} mobileOpen={mobileOpen} setMobile={setMobile} />
        <main className="main">
          {deferredPrompt && <div className="card" style={{position:'fixed', bottom:20, right:20, zIndex:100, maxWidth:300}}>
            <p>📲 Install DomusEA for offline access</p>
            <button className="btn btn-primary" style={{marginTop:8}} onClick={handleInstall}>Install App</button>
            <button className="btn" style={{marginLeft:8}} onClick={()=>setDeferredPrompt(null)}>Not now</button>
          </div>}
          {user.role==='sa' && <SADashboard />}
          {user.role==='admin' && <AdminDashboard />}
          {user.role==='tenant' && <TenantDashboard />}
        </main>
      </div>
    </div>
  );
}